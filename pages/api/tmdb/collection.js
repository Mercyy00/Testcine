import { fetchLiveCollection } from "../../../lib/tmdb";
import { getCollection } from "../../../lib/data";
import { applyApiGuard, handleApiError } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (!applyApiGuard(req, res, { cacheSeconds: 3600 })) {
    return;
  }

  const { id } = req.query;
  const targetId = typeof id === "string" ? id.trim() : "";
  if (!targetId || !/^[a-zA-Z0-9_-]{1,64}$/.test(targetId)) {
    return res.status(400).json({ error: "Invalid or missing collection id" });
  }

  const local = getCollection(targetId);
  if (local) return res.status(200).json(local);

  try {
    const live = await fetchLiveCollection(targetId);
    if (live) return res.status(200).json(live);
    return res.status(404).json({ error: "Collection not found" });
  } catch (e) {
    return handleApiError(res, e, "Failed to fetch collection");
  }
}
