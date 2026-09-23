import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { listMyOrgs } from "@/lib/auth/membership";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    const [first] = await listMyOrgs(user);
    redirect(first ? `/${first.slug}` : "/welcome");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-16">
      <p className="text-sm font-semibold tracking-wide text-muted-foreground">TRESTLE</p>
      <h1 className="mt-4 text-3xl font-semibold text-balance">
        The work before the build, as a methodology rather than a pile of spreadsheets.
      </h1>
      <p className="mt-4 text-muted-foreground">
        Readiness assessment, stakeholder mapping, change impact and process documentation for firms
        preparing clients for a new system, linked in one engagement.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup" className={buttonVariants()}>
          Create an account
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Sign in
        </Link>
      </div>
    </main>
  );
}
