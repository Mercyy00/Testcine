import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { applyApiGuard } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guarded = await applyApiGuard(req, res, { cacheSeconds: 0, limit: 5, windowMs: 60000, prefix: "user_email" });
  if (!guarded) return;

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const newEmail = String(req.body?.email || "").trim().toLowerCase();
  if (!newEmail || !newEmail.includes("@")) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (existing && existing.id !== session.user.id) {
      return res.status(409).json({ error: "Email address is already in use by another account." });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        email: newEmail,
        emailVerified: null, // Reset verification
      },
    });

    return res.status(200).json({ ok: true, email: newEmail, message: "Email updated successfully." });
  } catch (e) {
    console.error("Change email error:", e);
    return res.status(500).json({ error: "Could not update email address." });
  }
}
