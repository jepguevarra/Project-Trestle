import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ invite?: string; email?: string }> }) {
  const { invite, email } = await searchParams;
  return (
    <AuthCard
      title={invite ? "Create an account to accept" : "Create your firm's workspace"}
      description={invite ? "Use the address the invitation was sent to." : "You'll be its owner. Invite colleagues once you're in."}
    >
      <SignUpForm invite={invite} email={email} />
    </AuthCard>
  );
}
