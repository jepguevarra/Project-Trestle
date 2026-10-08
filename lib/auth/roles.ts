export const ROLES = ["owner", "admin", "consultant", "viewer"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { owner: 4, admin: 3, consultant: 2, viewer: 1 };

/** Mirrors private.role_rank in the database. */
export function hasRole(actual: Role, minimum: Role): boolean {
  return RANK[actual] >= RANK[minimum];
}

/** Roles `actor` may grant or revoke. Only owners manage owners; viewers and consultants manage nobody. */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "owner") return [...ROLES];
  if (actor === "admin") return ["admin", "consultant", "viewer"];
  return [];
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  consultant: "Consultant",
  viewer: "Viewer",
};
