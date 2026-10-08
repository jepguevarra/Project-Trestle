import Link from "next/link";

/** No href: a figure with nothing to open yet (e.g. respondents before phase 04). */
export type SmartButton = { label: string; value: string | number; href?: string };

/** Bordered tiles of number + label, each opening a filtered list. No icons (CLAUDE.md). */
export function SmartButtons({ buttons }: { buttons: SmartButton[] }) {
  if (!buttons.length) return null;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {buttons.map((b) => {
        const body = (
          <>
            <span className="font-semibold tabular-nums">{b.value}</span>
            <span className="text-muted-foreground">{b.label}</span>
          </>
        );
        const tile = "grid min-w-28 rounded-md border border-border bg-card px-3 py-1.5 text-sm";
        return b.href ? (
          <Link key={b.label} href={b.href as never} className={`${tile} hover:bg-muted`}>
            {body}
          </Link>
        ) : (
          <div key={b.label} className={tile}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
