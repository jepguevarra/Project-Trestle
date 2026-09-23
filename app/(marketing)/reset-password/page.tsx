import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetRequestForm } from "@/components/auth/reset-request-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Reset your password" description="We'll email you a link to set a new one.">
      <ResetRequestForm />
    </AuthCard>
  );
}
