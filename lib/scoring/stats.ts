/** Arithmetic mean, or null for an empty list. */
export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Weighted mean, or null when there is nothing (or no weight) to average. */
export function weightedMean(pairs: { value: number; weight: number }[]): number | null {
  const w = pairs.reduce((a, p) => a + p.weight, 0);
  return w > 0 ? pairs.reduce((a, p) => a + p.value * p.weight, 0) / w : null;
}

/** Sample variance (n − 1), or null below two values. */
export function variance(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
}

/** Sample standard deviation (n − 1), or null below two values. */
export function sd(xs: number[]): number | null {
  const v = variance(xs);
  return v === null ? null : Math.sqrt(v);
}

/** Pearson correlation, or null when either side has no variance or there are fewer than three pairs. */
export function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const mx = mean(xs)!;
  const my = mean(ys)!;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
    syy += (ys[i]! - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
}
