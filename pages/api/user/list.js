import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { applyApiGuard } from "../../../lib/api-guard";

export default async function handler(req, res) {
  const guarded = await applyApiGuard(req, res, { cacheSeconds: 0, prefix: "custom_list_api" });
  if (!guarded) return;

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "List ID is required" });
  }

  if (req.method === "GET") {
    try {
      const list = await prisma.customList.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, name: true, username: true, image: true },
          },
          items: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              titleId: true,
              titleData: true,
              position: true,
            },
          },
        },
      });

      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      const session = await getServerSession(req, res, authOptions);
      const isOwner = session?.user?.id === list.userId;

      if (!list.isPublic && !isOwner) {
        return res.status(403).json({ error: "This list is private" });
      }

      return res.status(200).json({
        id: list.id,
        name: list.name,
        description: list.description,
        isPublic: list.isPublic,
        updatedAt: list.updatedAt,
        user: list.user,
        items: list.items.map((i) => i.titleData || { id: i.titleId }),
      });
    } catch (err) {
      console.error("List lookup error:", err);
      return res.status(500).json({ error: "Database error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
