const axios = require("axios");
const { generateWithGemini } = require("../services/aiService");
const { screenPrompt } = require("../services/safetyService");

const PUBMED_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const MAX_RESULTS = 3;

exports.handleMedicalQuery = async (req, res) => {
  try {
    const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
    const safety = screenPrompt(prompt);
    if (!safety.allowed) {
      return res.status(safety.category === "invalid" ? 400 : 200).json({
        text: safety.message,
        isMedical: true,
        references: [],
        safety,
        verification: { status: "safety_redirect" },
      });
    }

    const searchParams = new URLSearchParams({
      db: "pubmed",
      term: prompt,
      retmode: "json",
      retmax: MAX_RESULTS,
      sort: "relevance",
      field: "title,abstract",
    });

    const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi?${searchParams}`;
    const searchResponse = await axios.get(searchUrl, { timeout: 10000 });

    if (!searchResponse.data?.esearchresult?.idlist?.length) {
      return res.status(404).json({
        error: "No relevant medical articles found",
        shouldFallback: true,
      });
    }

    const summaryParams = new URLSearchParams({
      db: "pubmed",
      id: searchResponse.data.esearchresult.idlist.join(","),
      retmode: "json",
    });

    const summaryUrl = `${PUBMED_BASE_URL}/esummary.fcgi?${summaryParams}`;
    const summaryResponse = await axios.get(summaryUrl, { timeout: 10000 });

    const articles = Object.values(summaryResponse.data.result)
      .slice(1)
      .filter((article) => article.title);

    if (articles.length === 0) {
      return res.status(404).json({
        error: "No complete medical articles found",
        shouldFallback: true,
      });
    }

    const sourceContext = articles
      .map(
        (article, index) =>
          `[${index + 1}] ${article.title}. ${article.source || "Journal not listed"}, ${article.pubdate || "date not listed"}. PMID ${article.uid}.`
      )
      .join("\n");

    let botResponse;
    let verification;
    try {
      const generated = await generateWithGemini({
        prompt: `User question: ${prompt}\n\nPubMed source records:\n${sourceContext}`,
        systemInstruction:
          "Answer as a cautious medical information assistant. Use only the supplied PubMed source records. Cite claims with [1], [2], or [3]. If the records are insufficient, say so. Do not diagnose or prescribe. End with a brief reminder that this does not replace professional medical advice.",
      });
      botResponse = generated.text;
      verification = {
        status: "citation_grounded",
        provider: "Gemini",
        model: generated.model,
        sourceCount: articles.length,
      };
    } catch (generationError) {
      console.warn("Grounded generation unavailable:", generationError.message);
      botResponse = `I found these relevant PubMed records:\n\n${sourceContext}\n\n*Review the linked sources with a qualified clinician. This information does not replace professional medical advice.*`;
      verification = {
        status: "references_only",
        sourceCount: articles.length,
      };
    }

    const references = articles.map((article) => ({
        title: article.title,
        authors: article.authors?.map((a) => a.name),
        journal: article.source,
        pubdate: article.pubdate,
        pmid: article.uid,
        url: `https://pubmed.ncbi.nlm.nih.gov/${article.uid}`,
      }));

    res.status(200).json({
      text: botResponse,
      isMedical: true,
      references,
      verification,
    });
  } catch (error) {
    console.error("PubMed API error:", error.message);

    res.status(503).json({
      error: "Medical service unavailable",
      shouldFallback: true,
    });
  }
};
