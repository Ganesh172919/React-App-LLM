/**
 * ============================================================================
 * MEDASSIST AI - GROUNDED MEDICAL QUERY CONTROLLER (medicalController.js)
 * ============================================================================
 * Role:
 *   Orchestrates evidence-grounded medical question answering. Coordinates
 *   safety screening, live literature retrieval via NCBI PubMed eUtils API,
 *   constrained Gemini generation bounded to retrieved evidence, and algorithmic
 *   citation verification.
 *
 * Grounding Pipeline:
 *   1. Safety Screening: Screens user prompt for harmful or emergency patterns.
 *   2. PubMed E-Search: Queries PubMed E-Utilities (`esearch.fcgi`) for up to 3
 *      top relevance articles matching the clinical terms.
 *   3. PubMed E-Summary: Fetches metadata (`esummary.fcgi`) including titles,
 *      journals, authors, publication dates, and PMIDs.
 *   4. Constrained LLM Prompting: Supplies source records numbered [1], [2], [3]
 *      to Gemini with strict instructions to cite only supplied evidence.
 *   5. Grounding Audit: Invokes `assessCitationGrounding` to ensure model output
 *      cites valid numbers without hallucinating non-existent source indices.
 *   6. Fallback Handling: If Gemini generation fails, presents raw PubMed citations
 *      with clinical consultation advisories.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: GROUNDED MEDICAL RETRIEVAL & CITATION AUDIT
 * ----------------------------------------------------------------------------
 * [medicalController.js (handleMedicalQuery)]
 *   │
 *   ├── 1. Safety Screening Layer
 *   │     ├── Calls screenPrompt(prompt)
 *   │     └── If disallowed: Returns 200/400 safety redirection
 *   │
 *   ├── 2. PubMed Literature Retrieval
 *   │     ├── Step A: E-Search query (db=pubmed, retmax=3, sort=relevance)
 *   │     │     └── If no PMIDs found: returns 404 { shouldFallback: true }
 *   │     └── Step B: E-Summary query (db=pubmed, id=pmid1,pmid2,pmid3)
 *   │           └── Extracts article titles, journals, dates, and PMIDs
 *   │
 *   ├── 3. Context Construction
 *   │     └── Formats sources: "[1] Title. Journal, Date. PMID..."
 *   │
 *   ├── 4. Bounded Gemini Generation
 *   │     ├── Directs model: "Use only supplied PubMed source records. Cite claims with [1], [2], [3]..."
 *   │     ├── On LLM Success:
 *   │     │     ├── Receives generated text with inline brackets
 *   │     │     └── Calls assessCitationGrounding(text, sourceCount)
 *   │     └── On LLM Exception:
 *   │           └── Falls back to "references_only" response mode with raw source links
 *   │
 *   └── 5. Response Assembly
 *         └── Returns 200 OK with:
 *               { text, isMedical: true, references: [...], verification: {...} }
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: PUBMED EVIDENCE RETRIEVAL & CITATION VERIFICATION
 * ----------------------------------------------------------------------------
 *  Client              medicalController                 NCBI PubMed API            Gemini AI
 *    │                        │                                 │                       │
 *    │── POST /api/medical ──>│                                 │                       │
 *    │   { prompt }           ├─ screenPrompt()                 │                       │
 *    │                        ├─ esearch.fcgi?term=prompt ─────>│                       │
 *    │                        │<─ { idlist: [pmid1, pmid2] } ───┤                       │
 *    │                        ├─ esummary.fcgi?id=pmids ───────>│                       │
 *    │                        │<─ { result: { metadata } } ─────┤                       │
 *    │                        │                                                         │
 *    │                        ├─ Build Source Context: [1]..., [2]...                   │
 *    │                        ├─ Generate Bounded Response ────────────────────────────>│
 *    │                        │<─ "According to [1], migraine causes... [2]" ───────────┤
 *    │                        │                                                         │
 *    │                        ├─ assessCitationGrounding(text, sourceCount)             │
 *    │                        │  - Valid citations: [1, 2]                              │
 *    │                        │  - Invalid citations: []                                │
 *    │                        │  - Grounded: true (100% coverage)                       │
 *    │<── 200 OK ─────────────┤                                                         │
 *    │    { text, references, │                                                         │
 *    │      verification }    │                                                         │
 * ============================================================================
 */
const axios = require("axios");
const { generateWithGemini } = require("../services/aiService");
const { screenPrompt } = require("../services/safetyService");
const { assessCitationGrounding } = require("../services/citationService");
const { buildPubMedQuery } = require("../services/pubmedService");

const PUBMED_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const MAX_RESULTS = 3;

/**
 * ----------------------------------------------------------------------------
 * METHOD: handleMedicalQuery
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW:
 * [handleMedicalQuery Execution]
 *   ├── Input Extraction: prompt = req.body.prompt.trim()
 *   ├── Safety Screening: screenPrompt(prompt)
 *   │     └── If !allowed: return 200/400 with safety_redirect verification
 *   ├── PubMed E-Utilities Search:
 *   │     ├── GET esearch.fcgi (term=prompt, retmax=3, sort=relevance)
 *   │     └── If no PMIDs found: return 404 { shouldFallback: true }
 *   ├── PubMed E-Utilities Summary:
 *   │     ├── GET esummary.fcgi (id=idlist)
 *   │     └── Parse articles (title, authors, journal, pubdate, pmid)
 *   ├── Context Formatting: [1] Title. Journal, Pubdate. PMID.
 *   ├── Grounded Gemini Generation:
 *   │     ├── Prompt Gemini with sourceContext & strict [1]..[N] citation rules
 *   │     ├── On Success: assessCitationGrounding(response, articles.length)
 *   │     └── On Failure: Fallback to references_only text with raw source links
 *   └── Return: 200 OK { text, isMedical: true, references, verification }
 *
 * ASCII FLOW:
 * [POST /api/medical] ──► screenPrompt()
 *                                │
 *            ┌───────────────────┴───────────────────┐
 *            ▼                                       ▼
 *      [!allowed]                                [allowed]
 *            │                                       │
 *            ▼                                       ▼
 *     Safety Redirect                     PubMed esearch.fcgi
 *                                                    │
 *                                        ┌───────────┴───────────┐
 *                                        ▼                       ▼
 *                                   [PMIDs Found]           [No PMIDs]
 *                                        │                       │
 *                                        ▼                       ▼
 *                               PubMed esummary.fcgi       404 Fallback
 *                                        │
 *                                        ▼
 *                               Build Source Context
 *                                        │
 *                                        ▼
 *                             generateWithGemini()
 *                                        │
 *                               ┌────────┴────────┐
 *                               ▼                 ▼
 *                           [Success]          [Error]
 *                               │                 │
 *                               ▼                 ▼
 *                     assessCitationGrounding() References Only
 *                               │                 │
 *                               └────────┬────────┘
 *                                        │
 *                                        ▼
 *                               200 OK Response JSON
 * ----------------------------------------------------------------------------
 */
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
      term: buildPubMedQuery(prompt),
      retmode: "json",
      retmax: MAX_RESULTS,
      sort: "relevance",
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
        ...assessCitationGrounding(botResponse, articles.length),
        provider: "Gemini",
        model: generated.model,
      };
    } catch (generationError) {
      console.warn("Grounded generation unavailable:", generationError.message);
      botResponse = `I found these relevant PubMed records:\n\n${sourceContext}\n\n*Review the linked sources with a qualified clinician. This information does not replace professional medical advice.*`;
      verification = {
        ...assessCitationGrounding(botResponse, articles.length),
        status: "references_only",
        provider: "PubMed",
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
