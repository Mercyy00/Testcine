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
import { applyApiGuard, clampInt, handleApiError } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (!applyApiGuard(req, res, { cacheSeconds: 1800 })) {
    return;
  }

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

  // Validate and clamp page to 1..100
  const validPage = clampInt(page, 1, 100, 1);
  const validType = type === "tv" ? "tv" : "movie";

  try {
    let items = [];

    if (category === "trending") {
      items = await fetchTrending(validType, "day");
    } else if (category === "popular") {
      items = await fetchPopular(validType, validPage);
    } else if (category === "top") {
      items = await fetchTopRated(validType, validPage);
    } else if (category === "now_playing") {
      items = await fetchNowPlaying(validPage);
    } else if (category === "upcoming") {
      items = await fetchUpcoming(validPage);
    } else if (category === "airing_today") {
      items = await fetchAiringToday(validPage);
    } else if (category === "on_the_air") {
      items = await fetchOnTheAir(validPage);
    } else {
      // General discover with custom filters
      items = await fetchDiscover({
        type: validType,
        genre: typeof genre === "string" ? genre.slice(0, 50) : undefined,
        service: typeof service === "string" ? service.slice(0, 50) : undefined,
        studio: typeof studio === "string" ? studio.slice(0, 50) : undefined,
        year: year ? clampInt(year, 1900, 2100, undefined) : undefined,
        country: typeof country === "string" ? country.slice(0, 10) : undefined,
        language: typeof language === "string" ? language.slice(0, 10) : undefined,
        rating: rating ? clampInt(rating, 0, 10, undefined) : undefined,
        sort_by: typeof sort_by === "string" ? sort_by.slice(0, 50) : undefined,
        page: validPage,
      });
    }

    return res.status(200).json(items || []);
  } catch (err) {
    return handleApiError(res, err, "Failed to discover titles");
  }
}
