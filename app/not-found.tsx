import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/" className="mt-6 text-sm text-primary underline-offset-4 hover:underline">
        Go to your workspace
      </Link>
    </main>
  );
}
