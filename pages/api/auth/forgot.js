import crypto from "crypto";
import { prisma } from "../../../lib/prisma";
import { applyApiGuard } from "../../../lib/api-guard";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guarded = await applyApiGuard(req, res, { cacheSeconds: 0, limit: 5, windowMs: 60000, prefix: "forgot_pwd" });
  if (!guarded) return;

  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // To prevent email enumeration, always return success even if user not found
    if (!user) {
      return res.status(200).json({ ok: true, message: "If an account with that email exists, password reset instructions have been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset token for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${email}` },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${email}`,
        token,
        expires,
      },
    });

    const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${siteUrl}/auth/reset?token=${token}&email=${encodeURIComponent(email)}`;

    // Optional email sending via Resend or log
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "DIVINE <security@divine.su>",
            to: email,
            subject: "Reset your DIVINE password",
            html: `<p>Hello,</p><p>You requested a password reset for DIVINE. Click the link below to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link will expire in 1 hour.</p>`,
          }),
        });
      } catch (err) {
        console.error("Failed to send reset email via Resend:", err);
      }
    } else {
      console.log(`[DIVINE Auth] Password reset link for ${email}: ${resetUrl}`);
    }

    return res.status(200).json({ ok: true, message: "If an account with that email exists, password reset instructions have been sent." });
  } catch (e) {
    console.error("Forgot password error:", e);
    return res.status(500).json({ error: "Could not process request." });
  }
}
