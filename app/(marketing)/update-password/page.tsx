import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Set a new password" };

export default async function UpdatePasswordPage() {
  await requireUser();
  return (
    <AuthCard title="Set a new password">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
