import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/validation/env";

const valid = {
  APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  EMAIL_DELIVERY: "console",
  EMAIL_FROM: "Trestle <no-reply@example.com>",
};

describe("parseEnv", () => {
  it("accepts a complete configuration", () => {
    expect(parseEnv(valid).EMAIL_DELIVERY).toBe("console");
  });

  it.each(Object.keys(valid).filter((k) => k !== "EMAIL_DELIVERY"))("fails when %s is missing", (key) => {
    const env: Record<string, string> = { ...valid };
    delete env[key];
    expect(() => parseEnv(env)).toThrow(key);
  });

  it("requires RESEND_API_KEY when delivering through Resend", () => {
    expect(() => parseEnv({ ...valid, EMAIL_DELIVERY: "resend", RESEND_API_KEY: "" })).toThrow("RESEND_API_KEY");
    expect(parseEnv({ ...valid, EMAIL_DELIVERY: "resend", RESEND_API_KEY: "re_123" }).RESEND_API_KEY).toBe("re_123");
  });

  it("defaults to Resend, so an unset EMAIL_DELIVERY cannot silently drop email", () => {
    const { EMAIL_DELIVERY: _unused, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow("RESEND_API_KEY");
  });

  it("refuses console email delivery in a production deploy, but allows a local production build", () => {
    expect(() => parseEnv({ ...valid, VERCEL_ENV: "production" })).toThrow("EMAIL_DELIVERY");
    expect(parseEnv({ ...valid, NODE_ENV: "production" }).EMAIL_DELIVERY).toBe("console");
  });
});
