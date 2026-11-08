import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { applyApiGuard } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guarded = await applyApiGuard(req, res, { cacheSeconds: 0, limit: 5, windowMs: 60000, prefix: "reset_pwd" });
  if (!guarded) return;

  const { token, email, password } = req.body || {};
  if (!token || !email || !password) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const record = await prisma.verificationToken.findFirst({
      where: {
        identifier: `reset:${cleanEmail}`,
        token,
      },
    });

    if (!record || record.expires < new Date()) {
      return res.status(400).json({ error: "Invalid or expired reset token. Please request a new one." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and bump tokenVersion to invalidate existing JWT sessions
    await prisma.user.update({
      where: { email: cleanEmail },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    // Clean up verification token
    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${cleanEmail}` },
    });

    return res.status(200).json({ ok: true, message: "Password updated successfully. You can now sign in." });
  } catch (e) {
    console.error("Password reset error:", e);
    return res.status(500).json({ error: "Could not reset password. Please try again." });
  }
}
