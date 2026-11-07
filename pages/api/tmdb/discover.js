import {
  fetchDiscover,
  fetchTrending,
  fetchPopular,
  fetchTopRated,
  fetchNowPlaying,
  fetchUpcoming,
  fetchAiringToday,
  fetchOnTheAir,
} from "../../../lib/tmdb";

export default async function handler(req, res) {
  const {
    category,
    type = "movie",
    genre,
    service,
    studio,
    year,
    country,
    language,
    rating,
    sort_by,
    page = 1,
  } = req.query;

  try {
    let items = [];

    if (category === "trending") {
      items = await fetchTrending(type === "movie" ? "movie" : "tv", "day");
    } else if (category === "popular") {
      items = await fetchPopular(type, Number(page));
    } else if (category === "top") {
      items = await fetchTopRated(type, Number(page));
    } else if (category === "now_playing") {
      items = await fetchNowPlaying(Number(page));
    } else if (category === "upcoming") {
      items = await fetchUpcoming(Number(page));
    } else if (category === "airing_today") {
      items = await fetchAiringToday(Number(page));
    } else if (category === "on_the_air") {
      items = await fetchOnTheAir(Number(page));
    } else {
      // General discover with custom filters
      items = await fetchDiscover({
        type,
        genre,
        service,
        studio,
        year,
        country,
        language,
        rating,
        sort_by,
        page: Number(page),
      });
    }

    return res.status(200).json(items || []);
  } catch (err) {
    console.error("Discover API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
