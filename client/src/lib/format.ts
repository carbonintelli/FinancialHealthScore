export function formatInr(n?: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatInrShort(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return formatInr(n);
}

export function scoreColor(score?: number | null) {
  if (score == null) return "var(--muted)";
  if (score >= 80) return "var(--score-excellent)";
  if (score >= 70) return "var(--score-good)";
  if (score >= 60) return "var(--score-fair)";
  if (score >= 50) return "var(--score-warn)";
  return "var(--score-poor)";
}

export function gradeClass(grade?: string | null) {
  if (!grade) return "";
  const g = grade.replace("+", "plus").replace("-", "minus");
  return `grade-badge grade-${g}`;
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
