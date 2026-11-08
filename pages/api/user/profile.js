import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { applyApiGuard } from "../../../lib/api-guard";

export default async function handler(req, res) {
  const guarded = await applyApiGuard(req, res, { cacheSeconds: 0, prefix: "profile_api" });
  if (!guarded) return;

  if (req.method === "GET") {
    const rawUsername = req.query.username;
    if (!rawUsername || typeof rawUsername !== "string") {
      return res.status(400).json({ error: "Username is required" });
    }

    const username = rawUsername.toLowerCase().trim();

    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: username, mode: "insensitive" } },
            { name: { equals: username, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
          isPublic: true,
          createdAt: true,
          watchHistory: {
            take: 60,
            orderBy: { watchedAt: "desc" },
            select: {
              titleId: true,
              titleData: true,
              progress: true,
              watchedAt: true,
              season: true,
              episode: true,
            },
          },
          watchlist: {
            take: 60,
            orderBy: { addedAt: "desc" },
            select: {
              titleId: true,
              titleData: true,
              addedAt: true,
            },
          },
          customLists: {
            where: { isPublic: true },
            select: {
              id: true,
              name: true,
              description: true,
              updatedAt: true,
              items: {
                take: 4,
                select: { titleId: true, titleData: true },
              },
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const session = await getServerSession(req, res, authOptions);
      const isOwner = session?.user?.id === user.id;

      // If user profile is private and not the owner
      if (!user.isPublic && !isOwner) {
        return res.status(200).json({
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
          createdAt: user.createdAt,
          isPublic: false,
          locked: true,
        });
      }

      return res.status(200).json({
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        bio: user.bio || "",
        isPublic: user.isPublic,
        createdAt: user.createdAt,
        locked: false,
        watchHistory: user.watchHistory || [],
        watchlist: user.watchlist || [],
        customLists: user.customLists || [],
      });
    } catch (e) {
      console.error("Profile fetch error:", e);
      return res.status(500).json({ error: "Failed to load profile" });
    }
  }

  if (req.method === "PUT") {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, bio, isPublic, image } = req.body || {};
    const data = {};

    if (typeof name === "string" && name.trim()) {
      data.name = name.trim().slice(0, 50);
    }
    if (typeof bio === "string") {
      data.bio = bio.trim().slice(0, 160);
    }
    if (typeof isPublic === "boolean") {
      data.isPublic = isPublic;
    }
    if (typeof image === "string") {
      data.image = image;
    }

    try {
      const updated = await prisma.user.update({
        where: { id: session.user.id },
        data,
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          isPublic: true,
          image: true,
        },
      });

      return res.status(200).json({ ok: true, user: updated });
    } catch (e) {
      console.error("Profile update error:", e);
      return res.status(500).json({ error: "Failed to update profile" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
