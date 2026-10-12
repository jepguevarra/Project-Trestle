import Link from "next/link";
import type { ReactNode } from "react";

/** The firm's settings: who is in it, and how its exports look. */
export default async function SettingsLayout({ children, params }: { children: ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const base = `/${orgSlug}/settings`;
  return (
    <div className="grid gap-6">
      <nav aria-label="Settings" className="flex gap-1 border-b border-border pb-2 text-sm">
        <Link href={`${base}/members` as never} className="rounded-md px-2 py-1 hover:bg-muted">
          Members
        </Link>
        <Link href={`${base}/branding` as never} className="rounded-md px-2 py-1 hover:bg-muted">
          Branding
        </Link>
      </nav>
      {children}
    </div>
  );
}
