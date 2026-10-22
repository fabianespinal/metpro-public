/**
 * Totals for the public quote and invoice pages.
 * Mirrors the backend (quotes.service.calculate_quote_totals) exactly:
 * - a charge percentage falls back to its default only when the key is absent (0 stays 0);
 * - dynamic charges count only when enabled is truthy, first 3 only, as a percentage of items_after_discount;
 * - tax = the document's own rate on subtotal_general (A1: tax_rate from the API). A backend that sends no rate
 *   is the pre-A1 backend, where every document is 18%.
 * Display only. The billed amount stays the source of truth for invoices.
 */

export interface TotalsItem {
  quantity: number;
  unit_price: number;
  discount_type?: string | null;
  discount_value?: number | null;
}

export interface ChargeRow {
  label: string;
  value: number;
}

export interface PublicTotals {
  itemsTotal: number;
  totalDiscounts: number;
  afterDiscount: number;
  charges: ChargeRow[];
  subtotalGeneral: number;
  itbis: number;
  grandTotal: number;
}

const num = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const STATIC_CHARGES: { key: string; label: string; def: number }[] = [
  { key: "supervision", label: "Supervisión", def: 10 },
  { key: "admin", label: "Administración", def: 4 },
  { key: "insurance", label: "Seguro", def: 1 },
  { key: "transport", label: "Transporte", def: 3 },
  { key: "contingency", label: "Contingencia", def: 3 },
];

/** Parse included_charges, which the API may send as a JSON string or an object. */
export function parseCharges(raw: unknown): Record<string, unknown> {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = raw ? JSON.parse(raw) : {};
    } catch {
      value = {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

const pctLabel = (p: number) => `${Number(p.toFixed(2))}%`;

/** Pre-A1 backends send no tax_rate and every document was taxed at 18%. */
const PRE_A1_RATE = 0.18;
const PRE_A1_LABEL = "ITBIS (18%)";

/** Rate and label to show. Both come from the document; the pre-A1 pair is used only when the API sends neither. */
export function taxDisplay(rate: unknown, label: unknown): { rate: number; label: string } {
  const r = rate === null || rate === undefined || rate === "" ? NaN : Number(rate);
  const text = typeof label === "string" ? label.trim() : "";
  if (Number.isFinite(r)) return { rate: r, label: text || "ITBIS" };
  return { rate: PRE_A1_RATE, label: text || PRE_A1_LABEL };
}

export function computePublicTotals(items: TotalsItem[], rawCharges: unknown, taxRate: number = PRE_A1_RATE): PublicTotals {
  const charges = parseCharges(rawCharges);
  const itemsTotal = items.reduce((s, i) => s + num(i.quantity) * num(i.unit_price), 0);
  let totalDiscounts = 0;
  for (const i of items) {
    const line = num(i.quantity) * num(i.unit_price);
    if (i.discount_type === "percentage") totalDiscounts += line * (num(i.discount_value) / 100);
    else if (i.discount_type === "fixed") totalDiscounts += num(i.discount_value);
  }
  const afterDiscount = itemsTotal - totalDiscounts;

  const rows: ChargeRow[] = [];
  for (const c of STATIC_CHARGES) {
    if (!charges[c.key]) continue;
    const pct = num(charges[`${c.key}_percentage`], c.def);
    rows.push({ label: `${c.label} (${pctLabel(pct)})`, value: afterDiscount * (pct / 100) });
  }
  const dynamic = Array.isArray(charges.dynamic_charges) ? charges.dynamic_charges : [];
  for (const d of dynamic.slice(0, 3)) {
    if (!d || typeof d !== "object") continue;
    const dc = d as Record<string, unknown>;
    if (!dc.enabled) continue;
    const pct = num(dc.percentage);
    const name = String(dc.name ?? "").trim() || "Cargo adicional";
    rows.push({ label: `${name} (${pctLabel(pct)})`, value: afterDiscount * (pct / 100) });
  }

  const subtotalGeneral = afterDiscount + rows.reduce((s, r) => s + r.value, 0);
  const itbis = subtotalGeneral * taxRate;
  return { itemsTotal, totalDiscounts, afterDiscount, charges: rows, subtotalGeneral, itbis, grandTotal: subtotalGeneral + itbis };
}
