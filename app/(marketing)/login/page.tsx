import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeNextPath } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <AuthCard
      title="Sign in"
      description={error === "link" ? "That link has expired or was already used. Sign in, or request a new one." : undefined}
    >
      <SignInForm next={next ? safeNextPath(next) : undefined} />
    </AuthCard>
  );
}
