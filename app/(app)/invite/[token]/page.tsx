import type { Metadata } from "next";
import Link from "next/link";
import { acceptInvitation } from "@/app/(app)/actions";
import { signOut } from "@/app/(marketing)/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { AcceptInvitationForm } from "@/components/org/accept-invitation-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  const here = `/invite/${encodeURIComponent(token)}`;

  if (!user) {
    return (
      <AuthCard title="You've been invited to Trestle" description="Sign in or create an account with the address the invitation was sent to.">
        <div className="grid gap-3">
          <Link href={`/signup?invite=${encodeURIComponent(token)}` as never} className={buttonVariants()}>
            Create an account
          </Link>
          <Link href={`/login?next=${encodeURIComponent(here)}` as never} className={buttonVariants({ variant: "outline" })}>
            Sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Accept invitation" description={`Signed in as ${user.email ?? "you"}.`}>
      <AcceptInvitationForm action={acceptInvitation.bind(null, token)} />
      <form action={signOut} className="mt-4">
        <button type="submit" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Not you? Sign out
        </button>
      </form>
    </AuthCard>
  );
}
