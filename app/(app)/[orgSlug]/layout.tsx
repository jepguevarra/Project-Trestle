import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/(marketing)/actions";
import { OrgSwitcher } from "@/components/org/org-switcher";
import { listMyOrgs, requireMembership } from "@/lib/auth/membership";
import { ROLE_LABELS } from "@/lib/auth/roles";

// The org shell. requireMembership 404s for anyone who is not a member, so nothing under
// /[orgSlug] renders for them, and whether the org exists is not revealed.
export default async function OrgLayout({ children, params }: { children: ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { user, org, role } = await requireMembership(orgSlug);
  const orgs = await listMyOrgs(user);
  const base = `/${org.slug}`;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link href={base as never} className="text-sm font-semibold tracking-wide text-muted-foreground">
            TRESTLE
          </Link>
          <OrgSwitcher current={org} orgs={orgs} />
          <nav className="flex gap-1 text-sm" aria-label="Organisation">
            <Link href={base as never} className="rounded-md px-2 py-1 hover:bg-muted">
              Dashboard
            </Link>
            <Link href={`${base}/settings/members` as never} className="rounded-md px-2 py-1 hover:bg-muted">
              Members
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {user.email} · {ROLE_LABELS[role]}
            </span>
            <form action={signOut}>
              <button type="submit" className="rounded-md px-2 py-1 hover:bg-muted">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
