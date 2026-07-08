const CRISIL_LONG_TERM_SCORES: Record<string, number> = {
  AAA: 98, "AA+": 93, AA: 90, "AA-": 87, "A+": 84, A: 81, "A-": 77,
  "BBB+": 72, BBB: 68, "BBB-": 63, "BB+": 57, BB: 52, "BB-": 47,
  "B+": 42, B: 37, "B-": 32, C: 22, D: 8,
};

const CRISIL_SHORT_TERM_SCORES: Record<string, number> = {
  "A1+": 94, A1: 90, "A2+": 85, A2: 80, "A3+": 74, A3: 68, "A4+": 58, A4: 50, D: 8,
};

const OUTLOOK_ADJUSTMENTS: Record<string, number> = {
  positive: 4, stable: 0, negative: -6, developing: -3,
};

export function crisilRatingToScore(rating: string, outlook?: string | null): number {
  const normalized = rating.toUpperCase().trim().replace(/ /g, "");
  let score = CRISIL_LONG_TERM_SCORES[normalized] ?? CRISIL_SHORT_TERM_SCORES[normalized];
  if (score === undefined) {
    for (const [key, val] of Object.entries({ ...CRISIL_LONG_TERM_SCORES, ...CRISIL_SHORT_TERM_SCORES })) {
      if (normalized.includes(key)) {
        score = val;
        break;
      }
    }
  }
  if (score === undefined) return 55;
  if (outlook) score += OUTLOOK_ADJUSTMENTS[outlook.toLowerCase().trim()] ?? 0;
  return Math.max(0, Math.min(100, score));
}
