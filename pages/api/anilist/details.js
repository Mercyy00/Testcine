import { fetchAniListDetails, extractAniListId } from "../../../lib/anilist.js";
import { applyApiGuard, handleApiError } from "../../../lib/api-guard.js";

export default async function handler(req, res) {
  if (!applyApiGuard(req, res, { cacheSeconds: 3600 })) {
    return;
  }

  const { id } = req.query;
  const targetId = typeof id === "string" ? id.trim() : "";

  if (!targetId || !/^[a-zA-Z0-9_.-]{1,200}$/.test(targetId)) {
    return res.status(400).json({ error: "Invalid or missing id parameter" });
  }

  const anilistId = extractAniListId(targetId);
  if (!anilistId) {
    return res.status(400).json({ error: "Could not parse valid AniList ID from parameter" });
  }

  try {
    const details = await fetchAniListDetails(anilistId);
    if (!details) {
      return res.status(404).json({ error: "Anime not found on AniList" });
    }
    return res.status(200).json(details);
  } catch (err) {
    return handleApiError(res, err, "Failed to fetch anime details from AniList");
  }
}
