import { getTitle } from "../../../lib/data.js";
import { fetchLiveTitle } from "../../../lib/tmdb.js";
import { fetchAniListDetails, extractAniListId } from "../../../lib/anilist.js";
import { applyApiGuard, handleApiError } from "../../../lib/api-guard.js";

export default async function handler(req, res) {
  if (!applyApiGuard(req, res, { cacheSeconds: 3600 })) {
    return;
  }

  const { id } = req.query;
  const targetId = typeof id === "string" ? id.trim() : "";

  // Validate ID format (slug or alphanumeric with hyphens/underscores/dots, max 200 chars)
  if (!targetId || !/^[a-zA-Z0-9_.-]{1,200}$/.test(targetId)) {
    return res.status(400).json({ error: "Invalid or missing id parameter" });
  }

  // Check if target is an anime (AniList)
  const isAnimeTarget =
    /^\d+$/.test(targetId) ||
    targetId.startsWith("anilist-") ||
    targetId.startsWith("anime-");

  if (isAnimeTarget) {
    try {
      const anime = await fetchAniListDetails(targetId);
      if (anime) return res.status(200).json(anime);
      return res.status(404).json({ error: "Anime not found on AniList" });
    } catch (err) {
      return handleApiError(res, err, "Failed to fetch anime details");
    }
  }

  // 1. Check local pre-seeded catalogue only if rich details, logo, and (if series/anime) full seasons exist
  const local = getTitle(targetId);
  const isSeries = local ? (local.type === "series" || local.type === "anime") : false;
  if (
    local &&
    local.cast &&
    local.cast.length > 0 &&
    local.videos &&
    local.logo &&
    (!isSeries || (local.seasonsList && local.seasonsList.length > 1))
  ) {
    return res.status(200).json(local);
  }

  // 2. Fetch live from TMDB (for movies and series only)
  try {
    let type = null;
    if (targetId.startsWith("movie-")) {
      type = "movie";
    } else if (targetId.startsWith("tv-") || targetId.startsWith("series-")) {
      type = "tv";
    }

    const live = await fetchLiveTitle(type || "any", targetId);
    if (live) {
      return res.status(200).json(live);
    }

    // Try TV if movie failed, or movie if TV failed
    const fallbackType = type === "movie" ? "tv" : "movie";
    const altLive = await fetchLiveTitle(fallbackType, targetId);
    if (altLive) {
      return res.status(200).json(altLive);
    }

    return res.status(404).json({ error: "Title not found" });
  } catch (err) {
    return handleApiError(res, err, "Failed to fetch title details");
  }
}
