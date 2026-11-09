import { z } from "zod";

const envSchema = z.object({
  TMDB_API_KEY: z.string().min(1, "TMDB_API_KEY is required to fetch media metadata from TMDB"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required for database connection"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required for session encryption"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
});

export function validateEnv() {
  // Validate strictly in production, warn in development
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.errors
      .map((e) => `• ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    if (process.env.NODE_ENV === "production") {
      console.error(`\n❌ [DIVINE Startup Error] Missing or invalid production environment variables:\n${issues}\n`);
      throw new Error(`Environment validation failed:\n${issues}`);
    } else {
      console.warn(`\n⚠️ [DIVINE Dev Warning] Missing environment variables:\n${issues}\n`);
    }
    return false;
  }
  return true;
}

export default validateEnv;
