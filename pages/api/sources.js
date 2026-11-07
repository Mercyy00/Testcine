import { resolveSources } from "../../lib/sources.mjs";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    return res.status(200).json(resolveSources(req.query));
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: status === 500 ? "Streaming is temporarily unavailable" : error.message });
  }
}
