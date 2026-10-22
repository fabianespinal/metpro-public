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

/** A3: the backend's own base amounts, sent when some lines are hidden from the customer. */
export interface ServerBase {
  itemsTotal: number;
  totalDiscounts: number;
  /** Present when the backend sends its full customer totals. The page then shows them as they are. */
  afterDiscount?: number;
  subtotalGeneral?: number;
  itbis?: number;
  grandTotal?: number;
}

/** Reads `display_totals` from a public payload. Null when the API sends none (no hidden lines, or an older backend). */
export function serverBase(raw: unknown): ServerBase | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const items = Number(r.items_total);
  const disc = Number(r.total_discounts);
  if (r.items_total === null || r.items_total === undefined || !Number.isFinite(items)) return null;
  const base: ServerBase = { itemsTotal: items, totalDiscounts: Number.isFinite(disc) ? disc : 0 };
  const sub = Number(r.subtotal_general);
  const tax = Number(r.itbis);
  const grand = Number(r.grand_total);
  if (
    r.subtotal_general !== null && r.subtotal_general !== undefined && Number.isFinite(sub) &&
    r.itbis !== null && r.itbis !== undefined && Number.isFinite(tax) &&
    r.grand_total !== null && r.grand_total !== undefined && Number.isFinite(grand)
  ) {
    const after = Number(r.items_after_discount);
    base.afterDiscount = r.items_after_discount !== null && r.items_after_discount !== undefined && Number.isFinite(after) ? after : base.itemsTotal - base.totalDiscounts;
    base.subtotalGeneral = sub;
    base.itbis = tax;
    base.grandTotal = grand;
  }
  return base;
}

export function computePublicTotals(
  items: TotalsItem[],
  rawCharges: unknown,
  taxRate: number = PRE_A1_RATE,
  base: ServerBase | null = null
): PublicTotals {
  const charges = parseCharges(rawCharges);
  // A3: with hidden lines the visible rows no longer add up to the billed base. Hide only: use the backend's base,
  // never re-spread the hidden amount over the visible lines.
  let itemsTotal = items.reduce((s, i) => s + num(i.quantity) * num(i.unit_price), 0);
  let totalDiscounts = 0;
  for (const i of items) {
    const line = num(i.quantity) * num(i.unit_price);
    if (i.discount_type === "percentage") totalDiscounts += line * (num(i.discount_value) / 100);
    else if (i.discount_type === "fixed") totalDiscounts += num(i.discount_value);
  }
  if (base) {
    itemsTotal = base.itemsTotal;
    totalDiscounts = base.totalDiscounts;
  }
  // Approved 2026-10-22: customers never see the indirect-cost breakdown. With the backend's full totals the page
  // shows them as sent: no charge rows, no local tax math.
  if (base && base.subtotalGeneral !== undefined && base.itbis !== undefined && base.grandTotal !== undefined) {
    return {
      itemsTotal,
      totalDiscounts,
      afterDiscount: base.afterDiscount ?? itemsTotal - totalDiscounts,
      charges: [],
      subtotalGeneral: base.subtotalGeneral,
      itbis: base.itbis,
      grandTotal: base.grandTotal,
    };
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
