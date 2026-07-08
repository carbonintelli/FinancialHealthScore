const SECTOR_BENCHMARKS: Record<string, Record<string, number>> = {
  auto_components: {
    median_revenue_inr: 35_000_000,
    median_current_ratio: 1.55,
    median_debt_ratio: 0.38,
    median_operating_margin_pct: 12.0,
    median_dscr: 1.45,
    median_carbon_intensity: 0.38,
    cohort_size: 1240,
  },
  manufacturing: {
    median_revenue_inr: 28_000_000,
    median_current_ratio: 1.48,
    median_debt_ratio: 0.42,
    median_operating_margin_pct: 10.5,
    median_dscr: 1.35,
    median_carbon_intensity: 0.42,
    cohort_size: 8500,
  },
  food_processing: {
    median_revenue_inr: 22_000_000,
    median_current_ratio: 1.4,
    median_debt_ratio: 0.45,
    median_operating_margin_pct: 9.0,
    median_dscr: 1.3,
    median_carbon_intensity: 0.35,
    cohort_size: 3200,
  },
  textiles: {
    median_revenue_inr: 18_000_000,
    median_current_ratio: 1.35,
    median_debt_ratio: 0.48,
    median_operating_margin_pct: 8.0,
    median_dscr: 1.25,
    median_carbon_intensity: 0.48,
    cohort_size: 5600,
  },
  services: {
    median_revenue_inr: 12_000_000,
    median_current_ratio: 1.6,
    median_debt_ratio: 0.3,
    median_operating_margin_pct: 15.0,
    median_dscr: 1.55,
    median_carbon_intensity: 0.15,
    cohort_size: 12000,
  },
  general: {
    median_revenue_inr: 20_000_000,
    median_current_ratio: 1.45,
    median_debt_ratio: 0.4,
    median_operating_margin_pct: 10.0,
    median_dscr: 1.35,
    median_carbon_intensity: 0.4,
    cohort_size: 25000,
  },
};

export function getSectorBenchmark(sector: string): Record<string, number> {
  const key = sector.toLowerCase().trim().replace(/ /g, "_");
  return SECTOR_BENCHMARKS[key] ?? SECTOR_BENCHMARKS.general;
}

export function estimatePercentile(value: number, median: number, higherIsBetter = true): number {
  if (median <= 0) return 50;
  let ratio = value / median;
  if (!higherIsBetter) ratio = value > 0 ? median / value : 0;
  const pct = 50 + 25 * Math.tanh((ratio - 1) * 2);
  return Math.max(1, Math.min(99, pct));
}
