import { z } from "zod";

const serverEnvSchema = z.object({
  TMDB_API_KEY: z.string().min(1, "TMDB_API_KEY is required for live metadata lookups").optional(),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_DISCORD_INVITE: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_ENABLED: z.string().optional(),
  NEXT_PUBLIC_GITHUB_ENABLED: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

export function validateEnv() {
  if (typeof window === "undefined") {
    const serverResult = serverEnvSchema.safeParse(process.env);
    if (!serverResult.success) {
      console.warn("⚠️ [Environment Validation Warning]:", serverResult.error.format());
    }
  }

  const clientResult = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_DISCORD_INVITE: process.env.NEXT_PUBLIC_DISCORD_INVITE,
    NEXT_PUBLIC_GOOGLE_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
    NEXT_PUBLIC_GITHUB_ENABLED: process.env.NEXT_PUBLIC_GITHUB_ENABLED,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!clientResult.success) {
    console.warn("⚠️ [Client Environment Warning]:", clientResult.error.format());
  }
}

// Auto-validate on import
validateEnv();

export default {
  validateEnv,
};
