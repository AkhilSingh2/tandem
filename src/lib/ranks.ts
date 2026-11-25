export const RANK_GAP = 1024;

export function rankBetween(before: number | null, after: number | null): number {
  if (before == null && after == null) return RANK_GAP;
  if (before == null) return (after ?? 0) - RANK_GAP;
  if (after == null) return before + RANK_GAP;
  const mid = (before + after) / 2;
  if (!Number.isFinite(mid) || mid === before || mid === after) {
    return before + RANK_GAP;
  }
  return mid;
}
