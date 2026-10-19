import { describe, expect, it } from "vitest";
import { fmtDay, fmtTimestamp, quoteNotice } from "@/lib/dates";

describe("public dates dd/mm/aaaa", () => {
  it("prints calendar dates as stored and timestamps on the Santo Domingo day", () => {
    expect(fmtDay("2026-11-30")).toBe("30/11/2026");
    expect(fmtDay("2026-10-17T00:00:00+00:00")).toBe("17/10/2026");
    expect(fmtTimestamp("2026-10-19T01:30:00.123")).toBe("18/10/2026");
  });
});

describe("quoteNotice (X-06)", () => {
  const today = "2026-10-18";
  it("flags rejected quotes", () => {
    expect(quoteNotice("Rejected", "2027-01-01", today)).toMatch(/rechazada/);
  });
  it("flags open quotes past their valid-until date", () => {
    expect(quoteNotice("Sent", "2026-10-01", today)).toBe("Esta cotización venció el 01/10/2026. Contáctenos para actualizarla.");
    expect(quoteNotice("Final", "2026-10-17", today)).toMatch(/venció/);
  });
  it("leaves current, accepted or undated quotes alone", () => {
    expect(quoteNotice("Sent", "2026-10-18", today)).toBeNull();
    expect(quoteNotice("Approved", "2026-10-01", today)).toBeNull();
    expect(quoteNotice("Invoiced", "2026-10-01", today)).toBeNull();
    expect(quoteNotice("Final", "", today)).toBeNull();
  });
});
