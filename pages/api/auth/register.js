import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { applyApiGuard } from "../../../lib/api-guard";

const schema = z.object({
  username: z.string().min(3, "Username must be 3–20 characters").max(20).regex(/^[a-zA-Z0-9_]+$/, "Username can only use letters, numbers and _"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!applyApiGuard(req, res, { cacheSeconds: 0 })) return;
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const username = parsed.data.username.toLowerCase();
  const email = parsed.data.email.toLowerCase();
  try {
    const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { id: true } });
    if (exists) return res.status(409).json({ error: "Email or username already taken" });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.create({ data: { username, email, passwordHash, name: parsed.data.username } });
    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error("register error:", e.code || e.message);
    return res.status(500).json({ error: "Could not create account" });
  }
}
