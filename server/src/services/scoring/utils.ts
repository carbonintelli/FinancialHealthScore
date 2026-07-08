import type { ConfidenceLevel, EvidenceInsight, RiskLevel } from "./types.js";

export function clamp(value: number, low = 0, high = 100): number {
  return Math.max(low, Math.min(high, value));
}

export function scoreToGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  if (score >= 30) return "D";
  return "F";
}

export function scoreToRisk(score: number): RiskLevel {
  if (score >= 75) return "low";
  if (score >= 60) return "moderate";
  if (score >= 45) return "elevated";
  if (score >= 30) return "high";
  return "critical";
}

export function avgConfidence(levels: ConfidenceLevel[]): ConfidenceLevel {
  const order: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };
  if (!levels.length) return "low";
  const avg = levels.reduce((a, c) => a + order[c], 0) / levels.length;
  if (avg >= 2.5) return "high";
  if (avg >= 1.5) return "medium";
  return "low";
}

export function insight(partial: EvidenceInsight): EvidenceInsight {
  return partial;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function bool(v: unknown): boolean {
  return v === true;
}
