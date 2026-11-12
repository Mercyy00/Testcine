import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { applyApiGuard } from "../../../lib/api-guard";

export default async function handler(req, res) {
  const guarded = await applyApiGuard(req, res, { cacheSeconds: 0, prefix: "admin_featured_api" });
  if (!guarded) return;

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied. Administrator privileges required." });
  }

  if (req.method === "GET") {
    try {
      const items = await prisma.featuredTitle.findMany({
        orderBy: { position: "asc" },
      });
      return res.status(200).json(items || []);
    } catch (err) {
      console.error("Admin featured list error:", err);
      return res.status(500).json({ error: "Database error fetching featured titles" });
    }
  }

  if (req.method === "POST") {
    const { action, id, titleId, titleData, position, active } = req.body || {};

    try {
      if (action === "add") {
        if (!titleId || !titleData) {
          return res.status(400).json({ error: "titleId and titleData are required" });
        }
        const count = await prisma.featuredTitle.count();
        const created = await prisma.featuredTitle.create({
          data: {
            titleId: String(titleId),
            titleData,
            position: typeof position === "number" ? position : count,
            active: active !== false,
          },
        });
        return res.status(201).json(created);
      }

      if (action === "toggle-active") {
        if (!id) return res.status(400).json({ error: "id is required" });
        const existing = await prisma.featuredTitle.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Item not found" });

        const updated = await prisma.featuredTitle.update({
          where: { id },
          data: { active: !existing.active },
        });
        return res.status(200).json(updated);
      }

      if (action === "delete") {
        if (!id) return res.status(400).json({ error: "id is required" });
        await prisma.featuredTitle.delete({ where: { id } });
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: "Invalid action" });
    } catch (err) {
      console.error("Admin featured action error:", err);
      return res.status(500).json({ error: "Database error performing action" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
