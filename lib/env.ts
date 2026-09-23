import { parseEnv, type Env } from "./validation/env";

/**
 * Every environment variable the app reads, validated once at boot.
 *
 * `next.config.ts` imports this module, so a missing or malformed variable fails `pnpm build`
 * rather than the first request that happens to need it. Server-only: Client Components read
 * `lib/env.public.ts` instead.
 */
export const env: Env = parseEnv(process.env);
