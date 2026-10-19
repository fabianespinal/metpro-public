/**
 * Public viewer dates: dd/mm/aaaa, Santo Domingo calendar (debug E-03 / X-06, 2026-10-18).
 * Same rules as the ERP (lib/dates.ts there):
 * - calendar dates (valid_until, invoice_date) print as stored, no time-zone shift;
 * - timestamps (created_at) are naive UTC from the API and use their Santo Domingo day.
 */
export const BUSINESS_TZ = "America/Santo_Domingo";

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export function businessToday(now: Date = new Date()): string {
  return ymd.format(now);
}

export function fmtDay(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value);
}

export function fmtTimestamp(value: string | null | undefined): string {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return fmtDay(s);
  const hasZone = /[zZ]$|[+-]\d\d:?\d\d$/.test(s);
  const d = new Date(hasZone ? s : s.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? fmtDay(s) : fmtDay(ymd.format(d));
}

/** Notice for a quote that can no longer be accepted: rejected, or past its valid-until date. */
export function quoteNotice(status: string, validUntil: string, today: string = businessToday()): string | null {
  if (status === "Rejected") return "Esta cotización fue rechazada y ya no está vigente.";
  const open = status === "Final" || status === "Sent";
  if (open && validUntil && validUntil.slice(0, 10) < today) {
    return `Esta cotización venció el ${fmtDay(validUntil)}. Contáctenos para actualizarla.`;
  }
  return null;
}
