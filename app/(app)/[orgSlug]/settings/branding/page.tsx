import type { Metadata } from "next";
import { LogoForm } from "@/components/org/logo-form";
import { ActionButton } from "@/components/ui/action-button";
import { requireMembership } from "@/lib/auth/membership";
import { hasRole } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { findLogo } from "@/lib/db/queries/results";
import { deleteLogo, uploadLogo } from "./actions";

export const metadata: Metadata = { title: "Branding" };

/** The firm's name and logo, as they appear on exported reports. */
export default async function BrandingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { user, org, role } = await requireMembership(orgSlug);
  const canManage = hasRole(role, "admin");
  const logo = await withRls(claimsFor(user), (tx) => findLogo(tx, org.id));

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-xl font-semibold">Branding</h1>
        <p className="mt-1 text-sm text-muted-foreground">Exported reports carry {org.name}&apos;s name and this logo.</p>
      </div>
      <section aria-labelledby="logo-heading" className="grid gap-3">
        <h2 id="logo-heading" className="text-sm font-semibold">
          Logo
        </h2>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a small inline data URL; next/image adds nothing here
          <img src={`data:${logo.logoType};base64,${logo.logo.toString("base64")}`} alt={`${org.name} logo`} className="h-16 w-auto self-start border border-border p-2" />
        ) : (
          <p className="text-sm text-muted-foreground">No logo yet. Reports show the firm&apos;s name only.</p>
        )}
        {canManage ? (
          <>
            <LogoForm action={uploadLogo.bind(null, org.slug)} />
            {logo ? <ActionButton action={deleteLogo.bind(null, org.slug)} label="Remove logo" pendingLabel="Removing…" confirmText="Remove the logo from reports?" /> : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Only owners and admins can change it.</p>
        )}
      </section>
    </div>
  );
}
