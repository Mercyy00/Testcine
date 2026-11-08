import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { applyApiGuard } from "../../../lib/api-guard";

export default async function handler(req, res) {
  const guarded = await applyApiGuard(req, res, { cacheSeconds: 0, prefix: "admin_users_api" });
  if (!guarded) return;

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied. Administrator privileges required." });
  }

  if (req.method === "GET") {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
          bannedAt: true,
          _count: {
            select: {
              watchHistory: true,
              watchlist: true,
              customLists: true,
            },
          },
        },
      });

      return res.status(200).json(users);
    } catch (err) {
      console.error("Admin users list error:", err);
      return res.status(500).json({ error: "Database error" });
    }
  }

  if (req.method === "POST") {
    const { action, userId } = req.body || {};
    if (!action || !userId) {
      return res.status(400).json({ error: "Action and userId are required" });
    }

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (action === "toggle-role") {
        if (targetUser.id === session.user.id) {
          return res.status(400).json({ error: "You cannot change your own admin role" });
        }
        const newRole = targetUser.role === "ADMIN" ? "USER" : "ADMIN";
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { role: newRole },
        });
        return res.status(200).json({ success: true, role: updated.role });
      }

      if (action === "ban") {
        if (targetUser.id === session.user.id) {
          return res.status(400).json({ error: "You cannot ban yourself" });
        }
        const updated = await prisma.user.update({
          where: { id: userId },
          data: {
            bannedAt: new Date(),
            tokenVersion: { increment: 1 }, // Instantly revoke active sessions
          },
        });
        return res.status(200).json({ success: true, bannedAt: updated.bannedAt });
      }

      if (action === "unban") {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { bannedAt: null },
        });
        return res.status(200).json({ success: true, bannedAt: null });
      }

      return res.status(400).json({ error: "Unknown action" });
    } catch (err) {
      console.error("Admin user action error:", err);
      return res.status(500).json({ error: "Database error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
