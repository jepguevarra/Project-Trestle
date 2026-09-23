import { z } from "zod";

/** Schema for every environment variable the app reads. Parsed at boot by `lib/env.ts`. */
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Set by Vercel. `next build` always runs with NODE_ENV=production, so this is what tells a real
    // production deploy apart from a local or CI build.
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    APP_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    DATABASE_URL: z.url(),
    EMAIL_DELIVERY: z.enum(["resend", "console"]).default("resend"),
    EMAIL_FROM: z.string().min(3),
    RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  })
  .refine((e) => e.EMAIL_DELIVERY !== "resend" || e.RESEND_API_KEY !== undefined, {
    message: "RESEND_API_KEY is required when EMAIL_DELIVERY=resend",
    path: ["RESEND_API_KEY"],
  })
  .refine((e) => e.VERCEL_ENV !== "production" || e.EMAIL_DELIVERY === "resend", {
    message: "EMAIL_DELIVERY=console is not allowed in a production deploy",
    path: ["EMAIL_DELIVERY"],
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}\nSee .env.example.`);
  }
  return result.data;
}
