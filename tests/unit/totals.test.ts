import { describe, expect, it } from "vitest";
import { computePublicTotals } from "@/lib/publicTotals";
import { formatMoneyES } from "@/lib/formatMoney";

describe("computePublicTotals (same math as the backend)", () => {
  const items = [
    { quantity: 10, unit_price: 100, discount_type: "none", discount_value: 0 },
    { quantity: 2, unit_price: 50, discount_type: "percentage", discount_value: 10 },
    { quantity: 1, unit_price: 200, discount_type: "fixed", discount_value: 20 },
  ];
  it("matches the backend for static and dynamic charges", () => {
    const charges = JSON.stringify({
      supervision: true, supervision_percentage: 10, admin: true, admin_percentage: 4,
      insurance: false, transport: false, contingency: false,
      dynamic_charges: [{ name: "Flete", enabled: true, percentage: 5 }, { name: "Off", enabled: false, percentage: 50 }],
    });
    const t = computePublicTotals(items, charges);
    expect(t.itemsTotal).toBeCloseTo(1300, 6);
    expect(t.afterDiscount).toBeCloseTo(1270, 6);
    expect(t.subtotalGeneral).toBeCloseTo(1511.3, 6);   // backend: 1511.30
    expect(t.charges).toHaveLength(3);                  // supervision, admin, Flete; "Off" is disabled
    expect(t.charges[2].label).toBe("Flete (5%)");
    expect(t.charges.map((c) => Number(c.value.toFixed(2)))).toEqual([127, 50.8, 63.5]);
  });
});

describe("formatMoneyES", () => {
  it("formats RD$ with separators and a leading sign", () => {
    expect(formatMoneyES(1156402.76)).toBe("RD$ 1,156,402.76");
    expect(formatMoneyES(-5)).toBe("-RD$ 5.00");
    expect(formatMoneyES(-0.001)).toBe("RD$ 0.00");
  });
});
