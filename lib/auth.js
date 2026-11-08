import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { checkRateLimit, getClientIp } from "./api-guard";

const providers = [
  CredentialsProvider({
    name: "credentials",
    credentials: { email: {}, password: {} },
    async authorize(credentials, req) {
      const email = String(credentials?.email || "").trim().toLowerCase();
      const password = String(credentials?.password || "");
      if (!email || !password) return null;

      const clientIp = getClientIp(req);
      const rateLimitKey = `login_throttle:${email}:${clientIp}`;

      // Check brute force rate limit (5 attempts per 60 seconds)
      const { success } = await checkRateLimit(rateLimitKey, { limit: 5, windowMs: 60000 });
      if (!success) {
        throw new Error("Too many login attempts. Please wait 1 minute before trying again.");
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      if (user.bannedAt) throw new Error("Account has been suspended.");

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
        role: user.role,
        tokenVersion: user.tokenVersion || 0,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }));
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(GitHubProvider({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }));
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers,
  pages: { signIn: "/auth/signin", error: "/auth/signin" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username || null;
        token.role = user.role || "USER";
        token.tokenVersion = user.tokenVersion || 0;
      } else if (token?.id) {
        // Verify user is not banned and token version is still valid
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { tokenVersion: true, bannedAt: true, role: true },
          });
          if (!dbUser || dbUser.bannedAt || (dbUser.tokenVersion !== undefined && dbUser.tokenVersion > (token.tokenVersion || 0))) {
            return null; // Invalidate session
          }
          token.role = dbUser.role || "USER";
        } catch {
          // If DB is temporarily unreachable, maintain token to avoid breaking UX
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
