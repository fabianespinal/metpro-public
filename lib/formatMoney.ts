/**
 * Public viewer money format (Spanish / DR style): "RD$ 1,234.56".
 * Comma for thousands, dot for decimals, always two decimals.
 * Display only. Used by the public quote and invoice pages.
 */
export function formatMoneyES(amount: number): string {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  const body = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safe));
  const negative = safe < 0 && Number(body.replace(/,/g, "")) !== 0;
  return `${negative ? "-" : ""}RD$ ${body}`;
}
