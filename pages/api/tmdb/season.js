import { tmdbFetch } from "../../../lib/tmdb";

export default async function handler(req, res) {
  const { tvId, season = 1 } = req.query;
  const id = typeof tvId === "string" ? tvId.trim() : "";
  const seasonNum = parseInt(season, 10) || 1;

  if (!id) {
    return res.status(400).json({ error: "Missing tvId parameter" });
  }

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
    console.error(`Season fetch error for tv/${id}/season/${seasonNum}:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
