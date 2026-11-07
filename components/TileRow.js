import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import MediaRow from "./MediaRow";
import BrandLogo from "./BrandLogos";
import styles from "./TileRow.module.css";

export default function TileRow({ title, items, param }) {
  return (
    <MediaRow title={title}>
      {items.map((it) => (
        <Link
          key={it.id}
          href={`/discover?${param}=${it.id}`}
          className={styles.tile}
          data-brand={it.id}
          style={{
            backgroundColor: it.bg,
            color: it.textColor || "#ffffff",
          }}
          aria-label={it.name}
        >
          <div className={styles.logoWrap}>
            <BrandLogo id={it.id} name={it.name} />
          </div>
          <div className={styles.footer}>
            <span className={styles.name}>{it.name}</span>
            <ArrowUpRight size={14} className={styles.arrow} strokeWidth={2.5} />
          </div>
        </Link>
      ))}
    </MediaRow>
  );
}
