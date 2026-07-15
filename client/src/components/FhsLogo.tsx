import { useId } from "react";

/** Inline brand mark — avoids broken /app/assets/logo.svg static paths behind SPA/nginx. */
export function FhsLogo({
  size = 44,
  className,
  title = "Financial Health Score",
}: {
  size?: number;
  className?: string;
  /** Empty string marks the logo as decorative (aria-hidden). */
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const g1 = `${uid}-g1`;
  const g2 = `${uid}-g2`;
  const decorative = title === "";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
    >
      {!decorative && <title>{title}</title>}
      <defs>
        <linearGradient id={g1} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a8cff" />
          <stop offset="50%" stopColor="#0f4c81" />
          <stop offset="100%" stopColor="#1a7f4e" />
        </linearGradient>
        <linearGradient id={g2} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill={`url(#${g1})`} />
      <circle cx="60" cy="60" r="38" stroke="rgba(255,255,255,.25)" strokeWidth="6" fill="none" />
      <circle
        cx="60"
        cy="60"
        r="38"
        stroke={`url(#${g2})`}
        strokeWidth="6"
        fill="none"
        strokeDasharray="180 240"
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <path
        d="M38 72 L52 56 L64 66 L82 44"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="82" cy="44" r="4" fill="#fff" />
      <text
        x="60"
        y="98"
        textAnchor="middle"
        fill="#fff"
        fontFamily="system-ui,sans-serif"
        fontSize="11"
        fontWeight="700"
        letterSpacing=".08em"
      >
        FHS
      </text>
    </svg>
  );
}
