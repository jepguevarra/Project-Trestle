import { describe, expect, it } from "vitest";
import { assignableRoles, hasRole } from "@/lib/auth/roles";
import { hashInvitationToken, generateInvitationToken } from "@/lib/tokens/invitation";
import { inviteMemberSchema, safeNextPath, signUpSchema } from "@/lib/validation/auth";

describe("roles", () => {
  it("ranks owner > admin > consultant > viewer", () => {
    expect(hasRole("owner", "admin")).toBe(true);
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("consultant", "admin")).toBe(false);
    expect(hasRole("viewer", "consultant")).toBe(false);
  });

  it("lets only owners manage owners, and only admins and up manage anyone", () => {
    expect(assignableRoles("owner")).toContain("owner");
    expect(assignableRoles("admin")).not.toContain("owner");
    expect(assignableRoles("consultant")).toEqual([]);
    expect(assignableRoles("viewer")).toEqual([]);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/acme", "/acme"],
    ["/invite/abc?x=1", "/invite/abc?x=1"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["https://evil.example", "/"],
    ["", "/"],
    [undefined, "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("invitation tokens", () => {
  it("are unique and hash to 64 hex chars (matching SQL sha256 → hex)", () => {
    const a = generateInvitationToken();
    expect(a).not.toBe(generateInvitationToken());
    expect(hashInvitationToken(a)).toMatch(/^[0-9a-f]{64}$/);
    // Known vector: sha256("abc").
    expect(hashInvitationToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("validation", () => {
  it("requires a firm name on normal sign-up but not when accepting an invitation", () => {
    const base = { email: "a@b.co", password: "password1" };
    expect(signUpSchema.safeParse(base).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, orgName: "Acme" }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...base, invite: "tok" }).success).toBe(true);
  });

  it("normalises invited emails and rejects unknown roles", () => {
    expect(inviteMemberSchema.parse({ email: " Bob@Example.COM ", role: "viewer" }).email).toBe("bob@example.com");
    expect(inviteMemberSchema.safeParse({ email: "bob@example.com", role: "superuser" }).success).toBe(false);
  });
});
