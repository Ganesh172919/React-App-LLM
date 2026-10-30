const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const STOP = new Set("about also and are been between can common could does for from give have how information into may more must only please should some such tell than that the their these this what when where which will with".split(" "));
const buildPubMedQuery = (prompt) => {
  const tokens = String(prompt || "").toLowerCase().match(/[a-z][a-z0-9-]+/g) || [];
  return [...new Set(tokens.filter((token) => token.length > 2 && !STOP.has(token)))].slice(0, 12).join(" ") || String(prompt || "").trim();
};
const orderedRecords = (result, requested = []) => {
  const ids = Array.isArray(result?.uids) ? result.uids : requested;
  return ids.map((uid) => result?.[uid]).filter((item) => item && typeof item.title === "string" && /^\d+$/.test(String(item.uid)));
};
const array = (value) => value == null ? [] : Array.isArray(value) ? value : [value];
const parseAbstracts = (xml) => {
  const parsed = new XMLParser({ ignoreAttributes: false, processEntities: false, parseTagValue: false }).parse(xml);
  const result = new Map();
  for (const article of array(parsed?.PubmedArticleSet?.PubmedArticle)) {
    const citation = article.MedlineCitation;
    const pmid = typeof citation?.PMID === "object" ? citation.PMID["#text"] : citation?.PMID;
    const flatten = (value) => typeof value === "string" ? value : Array.isArray(value) ? value.map(flatten).join(" ") : value && typeof value === "object" ? Object.entries(value).filter(([key]) => !key.startsWith("@_")).map(([, item]) => flatten(item)).join(" ") : "";
    const abstract = array(citation?.Article?.Abstract?.AbstractText).map(flatten).join("\n").trim();
    if (pmid && abstract) result.set(String(pmid), abstract.slice(0, 10000));
  }
  return result;
};
const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
let nextRequestAt = 0;
const fetchSources = async (prompt, { signal } = {}) => {
  const common = { db: "pubmed", tool: "medassist_student_project", ...(process.env.NCBI_API_KEY ? { api_key: process.env.NCBI_API_KEY } : {}) };
  const get = async (name, params, retries = 1) => {
    const wait = Math.max(0, nextRequestAt - Date.now());
    nextRequestAt = Math.max(nextRequestAt, Date.now()) + (process.env.NCBI_API_KEY ? 110 : 350);
    if (wait) await require("timers/promises").setTimeout(wait, undefined, { signal });
    try {
      return await axios.get(BASE + name, { params: { ...common, ...params }, timeout: 9000, signal, maxRedirects: 0, maxContentLength: 2 * 1024 * 1024 });
    } catch (err) {
      if (signal?.aborted) throw err;
      if (retries > 0 && err.response && [429, 502, 503, 504].includes(err.response.status)) {
        await require("timers/promises").setTimeout(500, undefined, { signal });
        return get(name, params, retries - 1);
      }
      throw err;
    }
  };
  let search = await get("esearch.fcgi", { term: buildPubMedQuery(prompt), retmode: "json", retmax: 3, sort: "relevance" });
  let ids = search.data?.esearchresult?.idlist;
  if (!Array.isArray(ids) || !ids.length) {
    const tokens = buildPubMedQuery(prompt).split(" ").filter(Boolean);
    if (tokens.length > 3) {
      try {
        const fallbackSearch = await get("esearch.fcgi", { term: tokens.slice(0, 3).join(" "), retmode: "json", retmax: 3, sort: "relevance" });
        if (Array.isArray(fallbackSearch.data?.esearchresult?.idlist) && fallbackSearch.data.esearchresult.idlist.length) {
          ids = fallbackSearch.data.esearchresult.idlist;
        }
      } catch (err) {
        if (signal?.aborted) throw err;
      }
    }
  }
  if (!Array.isArray(ids) || !ids.length) return [];
  const summary = await get("esummary.fcgi", { id: ids.join(","), retmode: "json" });
  const records = orderedRecords(summary.data?.result, ids);
  let abstracts = new Map();
  try { abstracts = parseAbstracts((await get("efetch.fcgi", { id: ids.join(","), retmode: "xml", rettype: "abstract" })).data); } catch (error) { if (signal?.aborted) throw error; }
  return records.map((record) => ({
    title: record.title, authors: array(record.authors).map((author) => author.name).filter(Boolean), journal: record.source || "",
    pubdate: record.pubdate || "", pmid: String(record.uid), url: "https://pubmed.ncbi.nlm.nih.gov/" + record.uid + "/",
    abstract: abstracts.get(String(record.uid)) || "",
  }));
};
module.exports = { buildPubMedQuery, orderedRecords, parseAbstracts, fetchSources };
