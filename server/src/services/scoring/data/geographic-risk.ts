const STATE_RISK_INDEX: Record<string, number> = {
  maharashtra: 82,
  gujarat: 80,
  karnataka: 81,
  tamil_nadu: 78,
  telangana: 77,
  haryana: 76,
  delhi: 79,
  punjab: 72,
  rajasthan: 68,
  uttar_pradesh: 62,
  madhya_pradesh: 65,
  west_bengal: 66,
  bihar: 55,
  odisha: 64,
  kerala: 74,
  andhra_pradesh: 70,
  jharkhand: 58,
  chhattisgarh: 60,
  assam: 58,
  goa: 75,
};

const TIER_ADJUSTMENT: Record<string, number> = {
  tier1: 5,
  tier2: 0,
  tier3: -5,
  rural: -10,
};

export function geographicRiskScore(state?: string | null, tier?: string | null): number {
  if (!state) return 65;
  const base = STATE_RISK_INDEX[state.toLowerCase().trim().replace(/ /g, "_")] ?? 65;
  const adj = tier ? (TIER_ADJUSTMENT[tier.toLowerCase()] ?? 0) : 0;
  return Math.max(0, Math.min(100, base + adj));
}
