import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { applyApiGuard } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guarded = await applyApiGuard(req, res, { cacheSeconds: 0, prefix: "user_signout_all" });
  if (!guarded) return;

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        tokenVersion: { increment: 1 },
      },
    });

    return res.status(200).json({ ok: true, message: "All sessions have been invalidated." });
  } catch (e) {
    console.error("Sign out all error:", e);
    return res.status(500).json({ error: "Could not invalidate sessions." });
  }
}
