import { searchTMDB } from "../../../lib/tmdb";
import { searchTitles as localSearch } from "../../../lib/data";
import { applyApiGuard, clampInt, handleApiError } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (!(await applyApiGuard(req, res, { cacheSeconds: 600 }))) {
    return;
  }

  const { q, limit = 20 } = req.query;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const validLimit = clampInt(limit, 1, 50, 20);

  if (!query) {
    return res.status(200).json([]);
  }

  try {
    const liveResults = await searchTMDB(query, validLimit);
    if (liveResults && liveResults.length > 0) {
      return res.status(200).json(liveResults);
    }
    // Fallback to local search if offline or TMDB returns no items
    const fallback = localSearch(query, validLimit);
    return res.status(200).json(fallback);
  } catch (err) {
    console.error("Search API error:", err);
    try {
      const fallback = localSearch(query, validLimit);
      return res.status(200).json(fallback);
    } catch {
      return handleApiError(res, err, "Search failed");
    }
  }
}
