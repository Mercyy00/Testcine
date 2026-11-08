import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session";

const MAX_ITEMS = 500;
const idOf = (e) => (typeof e === "string" ? e : e?.id);

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      const [history, watchlist, settings] = await Promise.all([
        prisma.watchHistory.findMany({ where: { userId: user.id }, orderBy: { watchedAt: "desc" }, take: MAX_ITEMS }),
        prisma.watchlistItem.findMany({ where: { userId: user.id }, orderBy: { position: "asc" }, take: MAX_ITEMS }),
        prisma.userSettings.findUnique({ where: { userId: user.id } }),
      ]);
      return res.status(200).json({
        history: history.map((h) => ({
          id: h.titleId, title: h.titleData, progress: h.progress, timeLeft: h.timeLeft || undefined,
          at: h.watchedAt.getTime(), ...(h.season ? { season: h.season, episode: h.episode } : {}),
        })),
        watchlist: watchlist.map((w) => ({ id: w.titleId, title: w.titleData })),
        extras: settings?.data || {},
      });
    }

    if (req.method === "PUT") {
      const { history, watchlist, extras } = req.body || {};
      const ops = [];
      if (Array.isArray(history)) {
        const rows = history.slice(0, MAX_ITEMS).filter((h) => h && typeof h.id === "string").map((h) => ({
          userId: user.id, titleId: h.id.slice(0, 200), titleData: h.title || {}, progress: Number(h.progress) || 0,
          season: Number(h.season) || 0, episode: Number(h.episode) || 0,
          timeLeft: typeof h.timeLeft === "string" ? h.timeLeft.slice(0, 40) : null,
          watchedAt: new Date(Number(h.at) || Date.now()),
        }));
        ops.push(prisma.watchHistory.deleteMany({ where: { userId: user.id } }));
        if (rows.length) ops.push(prisma.watchHistory.createMany({ data: rows, skipDuplicates: true }));
      }
      if (Array.isArray(watchlist)) {
        const rows = watchlist.slice(0, MAX_ITEMS).map((w, i) => ({ id: idOf(w), w, i })).filter((x) => typeof x.id === "string")
          .map(({ id, w, i }) => ({ userId: user.id, titleId: id.slice(0, 200), titleData: w?.title || {}, position: i }));
        ops.push(prisma.watchlistItem.deleteMany({ where: { userId: user.id } }));
        if (rows.length) ops.push(prisma.watchlistItem.createMany({ data: rows, skipDuplicates: true }));
      }
      if (extras && typeof extras === "object") {
        const json = JSON.stringify(extras);
        if (json.length > 200_000) return res.status(413).json({ error: "Too much data" });
        ops.push(prisma.userSettings.upsert({ where: { userId: user.id }, update: { data: extras }, create: { userId: user.id, data: extras } }));
      }
      await prisma.$transaction(ops);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("sync error:", e.code || e.message);
    return res.status(500).json({ error: "Sync failed" });
  }
}
