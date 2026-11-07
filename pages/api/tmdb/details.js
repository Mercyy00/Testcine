import { getTitle } from "../../../lib/data";
import { fetchLiveTitle } from "../../../lib/tmdb";

export default async function handler(req, res) {
  const { id } = req.query;
  const targetId = typeof id === "string" ? id.trim() : "";

  if (!targetId) {
    return res.status(400).json({ error: "Missing id parameter" });
  }

  // 1. Check local pre-seeded catalogue
  const local = getTitle(targetId);
  if (local) {
    return res.status(200).json(local);
  }

  // 2. Fetch live from TMDB
  try {
    let type = null;
    let tmdbId = targetId;

    if (targetId.startsWith("movie-")) {
      type = "movie";
      tmdbId = targetId.replace("movie-", "");
    } else if (targetId.startsWith("tv-") || targetId.startsWith("series-") || targetId.startsWith("anime-")) {
      type = "tv";
      tmdbId = targetId.replace(/^(tv|series|anime)-/, "");
    }

    const live = await fetchLiveTitle(type || "any", tmdbId);
    if (live) {
      return res.status(200).json(live);
    }

    // Try TV if movie failed, or movie if TV failed
    const fallbackType = type === "movie" ? "tv" : "movie";
    const altLive = await fetchLiveTitle(fallbackType, tmdbId);
    if (altLive) {
      return res.status(200).json(altLive);
    }

    return res.status(404).json({ error: "Title not found" });
  } catch (err) {
    console.error("Details API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
