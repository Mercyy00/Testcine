import { certVar } from "../lib/constants";
import styles from "./Meta.module.css";

export function RatingRing({ value, size = 38 }) {
  if (!value) return null;
  const strokeWidth = size > 45 ? 3 : 2.5;
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / 10);
  const color = value >= 7 ? "var(--ok)" : value >= 5 ? "var(--warn)" : "var(--danger)";
  return (
    <span className={styles.ring} style={{ width: size, height: size }} aria-label={`Rating ${value} out of 10`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <b style={{ fontSize: size <= 42 ? 13 : size * 0.27 }}>{Number(value).toFixed(1)}</b>
    </span>
  );
}

export function CertBadge({ cert, small }) {
  const dark = String(cert) === "PG";
  return (
    <span
      className={`${styles.cert} ${small ? styles.certSmall : ""}`}
      style={{ background: certVar(cert), color: dark ? "var(--cert-ink-dark)" : "var(--cert-ink)" }}
    >
      {cert}
    </span>
  );
}

export function Dot() {
  return <span className={styles.dot} aria-hidden="true" />;
}
