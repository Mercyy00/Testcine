import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getBrandLogoUrl } from "./BrandLogos";
import styles from "./BrandCard.module.css";

function hexToRgba(hex, alpha = 0.25) {
  if (!hex || typeof hex !== "string") return `rgba(255, 255, 255, ${alpha})`;
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return `rgba(255, 255, 255, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * <BrandCard item={serviceOrStudio} param="service" | "studio" />
 * Unified dark-glass brand card with centered logo, hover glow and fallback.
 */
export default function BrandCard({ item, param = "service", href }) {
  const [hasError, setHasError] = useState(false);
  const targetHref = href || `/discover?${param}=${encodeURIComponent(item.id)}`;
  const logoSrc = getBrandLogoUrl(item.id || item.name);
  const glow = hexToRgba(item.brandColor || item.bg, 0.25);
  const scale = item.logoScale || 1.0;

  return (
    <Link
      href={targetHref}
      className={styles.card}
      data-brand={item.id}
      style={{
        "--brand-glow": glow,
        "--logo-scale": scale,
      }}
      aria-label={item.name}
    >
      <div className={styles.logoArea}>
        <div className={styles.logoBox}>
          {!hasError && logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              aria-hidden="true"
              className={styles.logoImg}
              width="200"
              height="56"
              loading="lazy"
              decoding="async"
              onError={() => setHasError(true)}
            />
          ) : (
            <span className={styles.wordmarkFallback}>{item.name}</span>
          )}
        </div>
      </div>
      <div className={styles.footer}>
        <span className={styles.name}>{item.name}</span>
        <ArrowUpRight size={14} className={styles.arrow} strokeWidth={2.5} />
      </div>
    </Link>
  );
}
