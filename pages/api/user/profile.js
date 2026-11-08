import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { authOptions } from "../../../lib/auth";
import { applyApiGuard } from "../../../lib/api-guard";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().trim().max(160).optional(),
  image: z.string().trim().max(500).nullable().optional(),
  isPublic: z.boolean().optional(),
});

const publicSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  bio: true,
  isPublic: true,
  createdAt: true,
};

export default async function handler(req, res) {
  if (!(await applyApiGuard(req, res, { cacheSeconds: 0, limit: 30 }))) return;
  const session = await getServerSession(req, res, authOptions);

  if (req.method === "GET") {
    const username = typeof req.query.username === "string"
      ? req.query.username.trim().toLowerCase()
      : "";
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }
    const profile = await prisma.user.findUnique({
      where: { username },
      select: publicSelect,
    });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const isOwner = session?.user?.id === profile.id;
    if (!profile.isPublic && !isOwner) {
      return res.status(200).json({
        profile: {
          name: profile.name,
          username: profile.username,
          image: profile.image,
          isPublic: false,
          createdAt: profile.createdAt,
        },
        private: true,
      });
    }

    const [history, watchlistCount, ratings] = await Promise.all([
      prisma.watchHistory.findMany({
        where: { userId: profile.id },
        orderBy: { watchedAt: "desc" },
        take: 24,
        select: { titleId: true, titleData: true, progress: true, season: true, episode: true, watchedAt: true },
      }),
      prisma.watchlistItem.count({ where: { userId: profile.id } }),
      prisma.userSettings.findUnique({ where: { userId: profile.id }, select: { data: true } }),
    ]);
    const ratingData = ratings?.data && typeof ratings.data === "object" ? ratings.data.ratings : null;
    return res.status(200).json({
      profile,
      private: false,
      stats: {
        watched: history.length,
        watchlist: watchlistCount,
        ratings: ratingData && typeof ratingData === "object" ? Object.keys(ratingData).length : 0,
      },
      history,
      isOwner,
    });
  }

  if (req.method === "PUT") {
    if (!session?.user?.id) return res.status(401).json({ error: "Not signed in" });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const data = { ...parsed.data };
    if (data.username) data.username = data.username.toLowerCase();
    try {
      const profile = await prisma.user.update({
        where: { id: session.user.id },
        data,
        select: publicSelect,
      });
      return res.status(200).json({ profile });
    } catch (error) {
      if (error.code === "P2002") return res.status(409).json({ error: "Username is already taken" });
      console.error("profile update error:", error.code || error.message);
      return res.status(500).json({ error: "Could not update profile" });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
