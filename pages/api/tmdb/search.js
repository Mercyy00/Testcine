import { searchTMDB, searchPeopleTMDB } from "../../../lib/tmdb.js";
import { searchAniList } from "../../../lib/anilist.js";
import { applyApiGuard, clampInt, handleApiError } from "../../../lib/api-guard.js";

export default async function handler(req, res) {
  if (!applyApiGuard(req, res, { cacheSeconds: 0 })) {
    return;
  }

  const { q, limit = 20, type } = req.query;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const validLimit = clampInt(limit, 1, 50, 20);

  if (!query) {
    return res.status(200).json([]);
  }

  try {
    if (type === "anime") {
      const animeResults = await searchAniList(query, validLimit);
      return res.status(200).json(animeResults || []);
    }

    if (type === "person" || type === "people") {
      const people = await searchPeopleTMDB(query, validLimit);
      return res.status(200).json(people || []);
    }

    const liveResults = await searchTMDB(query, validLimit);
    if (liveResults?.didYouMean) {
      res.setHeader("X-Did-You-Mean", liveResults.didYouMean);
    }
    return res.status(200).json(liveResults || []);
  } catch (err) {
    console.error("Search API error:", err);
    return handleApiError(res, err, "Search failed");
  }
}
