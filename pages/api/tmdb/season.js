import { tmdbFetch } from "../../../lib/tmdb";
import { applyApiGuard, clampInt, handleApiError } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (!applyApiGuard(req, res, { cacheSeconds: 3600 })) {
    return;
  }

  const { tvId, season = 1 } = req.query;
  const id = typeof tvId === "string" ? tvId.trim() : "";

  // Validate tvId strictly against numeric ID to prevent path traversal or injection
  if (!id || !/^\d{1,9}$/.test(id)) {
    return res.status(400).json({ error: "Invalid tvId parameter: must be numeric digits only" });
  }

  // Clamp season number between 0 (specials) and 99
  const seasonNum = clampInt(season, 0, 99, 1);

  try {
    const data = await tmdbFetch(`/tv/${id}/season/${seasonNum}`);
    if (!data || !data.episodes) {
      return res.status(404).json({ error: "Season not found" });
    }

    const episodes = data.episodes.map((ep) => ({
      id: ep.id,
      seasonNumber: ep.season_number,
      episodeNumber: ep.episode_number,
      title: ep.name || `Episode ${ep.episode_number}`,
      overview: ep.overview || "No episode summary available.",
      still: ep.still_path
        ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
        : null,
      runtime: ep.runtime || 45,
      airDate: ep.air_date || "",
      rating: Number((ep.vote_average || 0).toFixed(1)),
    }));

    return res.status(200).json({
      seasonNumber: seasonNum,
      name: data.name || `Season ${seasonNum}`,
      episodes,
    });
  } catch (err) {
    return handleApiError(res, err, "Failed to fetch season details");
  }
}
