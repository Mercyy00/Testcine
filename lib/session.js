import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

// Returns the signed-in user id or sends 401.
export async function requireUser(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    res.status(401).json({ error: "Not signed in" });
    return null;
  }
  return session.user;
}
