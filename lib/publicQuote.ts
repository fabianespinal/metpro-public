/**
 * Public quote data: envelope unwrap + normalisation.
 * Every field is defaulted so a quote of any age renders instead of throwing.
 */

export interface PublicItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_type: "none" | "percentage" | "fixed";
  discount_value: number;
  category: string | null;
}

export interface PublicQuoteData {
  quote_id: string;
  label: string; // Q-<quote_number>, else Q-<id>, else "—"
  project_name: string;
  notes: string;
  status: string;
  created_at: string;
  valid_until: string;
  payment_terms: string;
  company_name: string;
  company_address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  items: PublicItem[];
  charges: Record<string, unknown>;
  dynamic_charges: { name: string; percentage: number }[];
}

/** The API answers {"data": payload, "success": true}. Return the payload; pass anything else through. */
export function unwrapEnvelope(body: unknown): unknown {
  if (body && typeof body === "object" && (body as { success?: unknown }).success === true && "data" in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function parseCharges(raw: unknown): Record<string, unknown> {
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

export function normalizeQuote(input: unknown): PublicQuoteData | null {
  const raw = unwrapEnvelope(input);
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;

  const number = q.quote_number ?? q.id;
  const label = number !== null && number !== undefined && str(number) !== "" ? `Q-${number}` : "—";

  const rawItems = Array.isArray(q.items) ? q.items : [];
  const items: PublicItem[] = rawItems
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => {
      const dt = i.discount_type === "percentage" || i.discount_type === "fixed" ? i.discount_type : "none";
      const cat = str(i.category).trim();
      return {
        product_name: str(i.product_name) || "Item",
        quantity: num(i.quantity),
        unit_price: num(i.unit_price),
        discount_type: dt,
        discount_value: num(i.discount_value),
        category: cat || null,
      };
    });

  const charges = parseCharges(q.included_charges);
  const dyn = Array.isArray(charges.dynamic_charges) ? charges.dynamic_charges : [];
  const dynamic_charges = dyn
    .filter((d): d is Record<string, unknown> => !!d && typeof d === "object" && (d as { enabled?: unknown }).enabled !== false)
    .map((d) => ({ name: str(d.name) || "Cargo", percentage: num(d.percentage) }));

  return {
    quote_id: str(q.quote_id),
    label,
    project_name: str(q.project_name),
    notes: str(q.notes),
    status: str(q.status),
    created_at: str(q.created_at), // full timestamp; the page shows its Santo Domingo day
    valid_until: str(q.valid_until).slice(0, 10),
    payment_terms: str(q.payment_terms),
    company_name: str(q.company_name),
    company_address: str(q.company_address),
    contact_name: str(q.contact_name),
    contact_email: str(q.contact_email),
    contact_phone: str(q.contact_phone),
    items,
    charges,
    dynamic_charges,
  };
}

/**
 * Group items by category in first-seen order. When no item has a category (older quotes,
 * manual quotes) there are no headings. When some do, items without one go under "Otros".
 */
export function groupItems(items: PublicItem[]): { heading: string | null; items: PublicItem[] }[] {
  if (!items.some((i) => i.category)) return [{ heading: null, items }];
  const groups: { heading: string | null; items: PublicItem[] }[] = [];
  for (const item of items) {
    const heading = item.category ?? "Otros";
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.items.push(item);
    else groups.push({ heading, items: [item] });
  }
  return groups;
}
