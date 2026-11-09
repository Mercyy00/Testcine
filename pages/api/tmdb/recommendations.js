import { fetchSmartRecommendations } from "../../../lib/tmdb.js";
import { fetchAniListDetails, extractAniListId } from "../../../lib/anilist.js";
import { applyApiGuard, clampInt, handleApiError } from "../../../lib/api-guard.js";

export default async function handler(req, res) {
  if (!applyApiGuard(req, res, { cacheSeconds: 1800 })) {
    return;
  }

  const { id, type = "movie", limit = 16 } = req.query;
  const targetId = typeof id === "string" ? id.trim() : "";
  const validLimit = clampInt(limit, 1, 30, 16);

  if (!targetId || !/^[a-zA-Z0-9_.-]{1,200}$/.test(targetId)) {
    return res.status(400).json({ error: "Invalid or missing id parameter" });
  }

  // AniList anime handling
  const isAnime =
    targetId.startsWith("anilist-") ||
    targetId.startsWith("anime-") ||
    type === "anime";

  if (isAnime) {
    try {
      const aniDetails = await fetchAniListDetails(targetId);
      if (aniDetails?.recommendations && aniDetails.recommendations.length > 0) {
        return res.status(200).json(aniDetails.recommendations.slice(0, validLimit));
      }
      return res.status(200).json([]);
    } catch (err) {
      return handleApiError(res, err, "Failed to fetch anime recommendations");
    }
  }

  try {
    const endpointType = targetId.startsWith("movie-")
      ? "movie"
      : targetId.startsWith("tv-") || targetId.startsWith("series-") || type === "tv" || type === "series"
      ? "tv"
      : type === "movie"
      ? "movie"
      : "movie";

    const recs = await fetchSmartRecommendations(endpointType, targetId, validLimit);
    return res.status(200).json(recs || []);
  } catch (err) {
    return handleApiError(res, err, "Failed to fetch recommendations");
  }
}
