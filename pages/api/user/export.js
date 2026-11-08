import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session";
import { applyApiGuard } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!(await applyApiGuard(req, res, { cacheSeconds: 0, limit: 10 }))) return;
  const user = await requireUser(req, res);
  if (!user) return;
  const [profile, history, watchlist, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true, username: true, email: true, createdAt: true } }),
    prisma.watchHistory.findMany({ where: { userId: user.id } }),
    prisma.watchlistItem.findMany({ where: { userId: user.id } }),
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
  ]);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="vivarium-export.json"');
  res.status(200).send(JSON.stringify({ profile, history, watchlist, settings: settings?.data || {} }, null, 2));
}
