import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { applyApiGuard } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guarded = await applyApiGuard(req, res, { cacheSeconds: 0, limit: 5, windowMs: 60000, prefix: "user_pwd" });
  if (!guarded) return;

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters long." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // If user already had a password, verify current password
    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required." });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(400).json({ error: "Incorrect current password." });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    return res.status(200).json({ ok: true, message: "Password changed successfully." });
  } catch (e) {
    console.error("Change password error:", e);
    return res.status(500).json({ error: "Could not update password." });
  }
}
