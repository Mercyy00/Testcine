import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await requireUser(req, res);
  if (!user) return;
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  // Password accounts must confirm; OAuth-only accounts have no password.
  if (row?.passwordHash && !(await bcrypt.compare(String(req.body?.password || ""), row.passwordHash))) {
    return res.status(403).json({ error: "Incorrect password" });
  }
  await prisma.user.delete({ where: { id: user.id } }); // cascades
  return res.status(200).json({ ok: true });
}
