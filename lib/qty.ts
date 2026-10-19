/** Quantity display (E-11): whole numbers print as "120", fractions keep up to 2 decimals. */
export function qty(v: unknown): string {
  const n = Number(v);
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}
