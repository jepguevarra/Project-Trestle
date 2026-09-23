import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Phase 01 acceptance: the service-role key appears in no Client Component and in no NEXT_PUBLIC_
// variable. Enforced structurally rather than by review.

const root = join(__dirname, "..", "..");
const scanned = ["app", "components", "lib", "middleware.ts"];

function files(path: string): string[] {
  const full = join(root, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full).flatMap((name) => files(join(path, name)));
}

const sources = scanned
  .flatMap(files)
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => ({ path: relative(root, f), text: readFileSync(f, "utf8") }));

const isClient = (text: string) => /^\s*["']use client["']/.test(text);

describe("secrets boundary", () => {
  it("no NEXT_PUBLIC_ variable names a service-role or secret key", () => {
    const offenders = sources.flatMap(({ path, text }) =>
      [...text.matchAll(/NEXT_PUBLIC_[A-Z0-9_]*(SERVICE|SECRET|PRIVATE)[A-Z0-9_]*/g)].map((m) => `${path}: ${m[0]}`),
    );
    const example = readFileSync(join(root, ".env.example"), "utf8");
    offenders.push(...[...example.matchAll(/^NEXT_PUBLIC_\w*(SERVICE|SECRET|PRIVATE)\w*/gm)].map((m) => `.env.example: ${m[0]}`));
    expect(offenders).toEqual([]);
  });

  it("no Client Component mentions the service role or imports server env or the database", () => {
    const offenders = sources
      .filter(({ text }) => isClient(text))
      .filter(({ text }) =>
        /service_role|SERVICE_ROLE|@\/lib\/env["']|@\/lib\/db|@\/lib\/supabase\/server|@\/lib\/email/.test(text),
      )
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it("the service role is not used anywhere yet (phase 04 introduces it in one route handler)", () => {
    const offenders = sources.filter(({ text }) => /SERVICE_ROLE|service_role/.test(text)).map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
