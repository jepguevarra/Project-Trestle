import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { CreateOrgForm } from "@/components/org/create-org-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create a workspace" };

// Where a signed-in user with no organisation lands: someone who signed up through an invitation
// and has not accepted it yet, or who has left every org.
export default async function WelcomePage() {
  await requireUser();
  return (
    <AuthCard
      title="Create a workspace"
      description="Waiting on an invitation instead? Open the link in the email you were sent."
    >
      <CreateOrgForm />
    </AuthCard>
  );
}
