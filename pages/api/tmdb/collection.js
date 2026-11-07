import { fetchLiveCollection } from "../../../lib/tmdb";
import { getCollection } from "../../../lib/data";

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const local = getCollection(id);
  if (local) return res.status(200).json(local);

  try {
    const live = await fetchLiveCollection(id);
    if (live) return res.status(200).json(live);
    return res.status(404).json({ error: "Collection not found" });
  } catch (e) {
    console.error("Collection API error:", e);
    return res.status(500).json({ error: e.message });
  }
}
