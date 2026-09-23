import Link from "next/link";

type Org = { slug: string; name: string };

/** Native <details> disclosure: no client JS, works with keyboard and on phones. */
export function OrgSwitcher({ current, orgs }: { current: Org; orgs: Org[] }) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 text-sm font-medium hover:bg-muted">
        <span className="max-w-48 truncate">{current.name}</span>
        <span aria-hidden className="text-muted-foreground group-open:rotate-180">▾</span>
      </summary>
      <div className="absolute left-0 z-10 mt-1 w-64 rounded-md border border-border bg-card p-1 shadow-sm">
        <p className="px-2 py-1 text-xs text-muted-foreground">Switch organisation</p>
        {orgs.map((o) => (
          <Link
            key={o.slug}
            href={`/${o.slug}` as never}
            aria-current={o.slug === current.slug ? "page" : undefined}
            className="block truncate rounded px-2 py-1.5 text-sm hover:bg-muted aria-[current=page]:font-semibold"
          >
            {o.name}
          </Link>
        ))}
        <Link href="/welcome" className="mt-1 block border-t border-border px-2 py-1.5 text-sm text-primary">
          New organisation…
        </Link>
      </div>
    </details>
  );
}
