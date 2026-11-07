import { searchTMDB } from "../../../lib/tmdb";
import { searchTitles as localSearch } from "../../../lib/data";

export default async function handler(req, res) {
  const { q, limit = 20 } = req.query;
  const query = typeof q === "string" ? q.trim() : "";

  if (!query) {
    return res.status(200).json([]);
  }

  try {
    const liveResults = await searchTMDB(query, Number(limit));
    if (liveResults && liveResults.length > 0) {
      return res.status(200).json(liveResults);
    }
    // Fallback to local search if offline or TMDB returns no items
    const fallback = localSearch(query, Number(limit));
    return res.status(200).json(fallback);
  } catch (err) {
    console.error("Search API error:", err);
    const fallback = localSearch(query, Number(limit));
    return res.status(200).json(fallback);
  }
}
