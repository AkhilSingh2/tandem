import { describe, expect, it } from "vitest";
import { RANK_GAP, rankBetween } from "@/lib/ranks";

describe("rankBetween", () => {
  it("starts a column at the gap", () => {
    expect(rankBetween(null, null)).toBe(RANK_GAP);
  });

  it("appends after the last card", () => {
    expect(rankBetween(2048, null)).toBe(2048 + RANK_GAP);
  });

  it("inserts halfway between neighbors", () => {
    expect(rankBetween(1000, 2000)).toBe(1500);
  });

  it("stays finite when the gap collapses", () => {
    const rank = rankBetween(1, 1);
    expect(Number.isFinite(rank)).toBe(true);
    expect(rank).not.toBe(1);
  });
});
