import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
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

      // Hash the email before using it as a Redis key so credentials/PII are not
      // exposed in the rate-limit store. The IP component also blocks spraying.
      const emailKey = createHash("sha256").update(email).digest("hex").slice(0, 24);
      try {
        const attempt = await checkRateLimit({
          identifier: `${getClientIp(req)}:${emailKey}`,
          namespace: "credentials-login",
          limit: 8,
          window: "15 m",
          windowMs: 15 * 60 * 1000,
        });
        if (!attempt.success) return null;
      } catch (error) {
        console.error("Login rate limiter error:", error.message);
        return null;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      if (!(await bcrypt.compare(password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email, image: user.image, username: user.username, role: user.role };
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
