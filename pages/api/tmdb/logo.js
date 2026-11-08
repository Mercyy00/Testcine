import { fetchLogoForId } from "../../../lib/tmdb";
import { applyApiGuard, handleApiError } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (!(await applyApiGuard(req, res, { cacheSeconds: 86400 }))) {
    return;
  }

  const { id, type = "movie" } = req.query;
  const targetId = typeof id === "string" ? id.trim() : "";

  if (!targetId || !/^[a-zA-Z0-9_.-]{1,100}$/.test(targetId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const logo = await fetchLogoForId(targetId, type);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({ logo: logo || null });
  } catch (err) {
    return handleApiError(res, err, "Failed to fetch logo");
  }
}
