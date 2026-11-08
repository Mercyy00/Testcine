import { searchAniList } from "../../../lib/anilist.js";
import { applyApiGuard, clampInt, handleApiError } from "../../../lib/api-guard.js";

export default async function handler(req, res) {
  if (!applyApiGuard(req, res, { cacheSeconds: 600 })) {
    return;
  }

  const { q, limit = 20 } = req.query;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const validLimit = clampInt(limit, 1, 50, 20);

  if (!query) {
    return res.status(200).json([]);
  }

  try {
    const results = await searchAniList(query, validLimit);
    return res.status(200).json(results || []);
  } catch (err) {
    return handleApiError(res, err, "Failed to search anime on AniList");
  }
}
