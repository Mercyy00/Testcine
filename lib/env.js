import { z } from "zod";

const serverEnvSchema = z
  .object({
    TMDB_API_KEY: z.string().trim().min(1, "TMDB_API_KEY is required"),
    DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().trim().optional(),
    NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
    NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be an absolute URL"),
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    const hasUrl = Boolean(env.UPSTASH_REDIS_REST_URL);
    const hasToken = Boolean(env.UPSTASH_REDIS_REST_TOKEN);
    if (hasUrl !== hasToken) {
      ctx.addIssue({
        code: "custom",
        path: hasUrl ? ["UPSTASH_REDIS_REST_TOKEN"] : ["UPSTASH_REDIS_REST_URL"],
        message: "Both Upstash Redis variables must be set together",
      });
    }
    if (
      process.env.NODE_ENV === "production" &&
      env.NEXT_PUBLIC_SITE_URL &&
      env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") !== env.NEXTAUTH_URL.replace(/\/$/, "")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SITE_URL"],
        message: "NEXT_PUBLIC_SITE_URL must match NEXTAUTH_URL in production",
      });
    }
  });

let cached;
let warned = false;

/** Validate server-only environment variables once per process. */
export function getServerEnv() {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (parsed.success) {
    cached = parsed.data;
    return cached;
  }

  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("\n");
  const message = `Invalid Vivarium server environment:\n${details}`;
  if (process.env.NODE_ENV === "production") throw new Error(message);
  if (!warned) {
    warned = true;
    console.warn(message);
  }
  return process.env;
}

export function validateProductionEnv() {
  return getServerEnv();
}
