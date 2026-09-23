/**
 * The only environment values a Client Component may read. Each must be referenced as a literal
 * `process.env.NEXT_PUBLIC_*` so Next.js inlines it at build time. Validated server-side by
 * `lib/env.ts`, which runs at build.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
};
