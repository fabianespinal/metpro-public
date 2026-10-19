import { describe, expect, it } from "vitest";
import { qty } from "../../lib/qty";

describe("qty (E-11)", () => {
  it("prints whole numbers without decimals and keeps real fractions", () => {
    expect(qty(120)).toBe("120");
    expect(qty("2.5")).toBe("2.5");
    expect(qty(1200)).toBe("1,200");
    expect(qty(undefined)).toBe("0");
  });
});
