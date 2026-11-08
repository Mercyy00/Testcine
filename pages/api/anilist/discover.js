import { fetchAniListDiscover } from "../../../lib/anilist.js";
import { applyApiGuard, clampInt, handleApiError } from "../../../lib/api-guard.js";

export default async function handler(req, res) {
  if (!applyApiGuard(req, res, { cacheSeconds: 1800 })) {
    return;
  }

  const {
    category = "trending",
    genre,
    tag,
    keywords,
    subgenre,
    studio,
    year,
    rating,
    page = 1,
    perPage = 24,
    limit,
    search,
  } = req.query;

  const validPage = clampInt(page, 1, 50, 1);
  const validPerPage = clampInt(limit || perPage, 1, 50, 24);

  try {
    const items = await fetchAniListDiscover({
      category: typeof category === "string" ? category : "trending",
      genre: typeof genre === "string" ? genre : undefined,
      tag: typeof (tag || subgenre || keywords) === "string" ? (tag || subgenre || keywords) : undefined,
      studio: typeof studio === "string" ? studio : undefined,
      year: typeof year === "string" ? year : undefined,
      rating: typeof rating === "string" ? rating : undefined,
      search: typeof search === "string" ? search : undefined,
      page: validPage,
      perPage: validPerPage,
    });

    return res.status(200).json(items || []);
  } catch (err) {
    return handleApiError(res, err, "Failed to discover anime from AniList");
  }
}
