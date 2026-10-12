import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 text-sm font-semibold tracking-wide text-muted-foreground">
        TRESTLE
      </Link>
      <Card>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        <div className="mt-6">{children}</div>
      </Card>
    </main>
  );
}
