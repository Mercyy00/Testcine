import { getTitle } from "../../../lib/data";
import { fetchLiveTitle } from "../../../lib/tmdb";
import { applyApiGuard, handleApiError } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (!(await applyApiGuard(req, res, { cacheSeconds: 3600 }))) {
    return;
  }

  const { id } = req.query;
  const targetId = typeof id === "string" ? id.trim() : "";

  // Validate ID format (slug or alphanumeric with hyphens/underscores/dots, max 200 chars)
  if (!targetId || !/^[a-zA-Z0-9_.-]{1,200}$/.test(targetId)) {
    return res.status(400).json({ error: "Invalid or missing id parameter" });
  }

  // 1. Check local pre-seeded catalogue only if rich details and logo exist
  const local = getTitle(targetId);
  if (local && local.cast && local.cast.length > 0 && local.videos && local.logo) {
    return res.status(200).json(local);
  }

  // 2. Fetch live from TMDB
  try {
    let type = null;
    if (targetId.startsWith("movie-")) {
      type = "movie";
    } else if (targetId.startsWith("tv-") || targetId.startsWith("series-") || targetId.startsWith("anime-")) {
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
