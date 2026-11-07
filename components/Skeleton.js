import styles from "./Skeleton.module.css";

export function SkeletonCard({ wide = true, fluid = false }) {
  return (
    <div
      className={`${styles.card} ${wide ? "" : styles.posterCard} ${
        fluid ? styles.cardFluid : ""
      }`}
      aria-hidden="true"
    >
      <div
        className={`${styles.artPlaceholder} ${
          wide ? "" : styles.posterArtPlaceholder
        } ${styles.shimmer}`}
      />
      <div className={styles.metaPlaceholder}>
        <div className={`${styles.titleLine} ${styles.shimmer}`} />
        <div className={`${styles.subLine} ${styles.shimmer}`} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12, wide = true }) {
  return (
    <div className={`${styles.grid} ${wide ? styles.gridWide : ""}`} aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} wide={wide} fluid />
      ))}
    </div>
  );
}

export function SkeletonRow({ title, count = 6, wide = true }) {
  return (
    <section className={styles.rowSection} aria-busy="true" aria-label="Loading row">
      <div className={styles.rowHeader}>
        {title ? (
          <h2 className={styles.rowTitle}>{title}</h2>
        ) : (
          <div className={`${styles.rowTitlePlaceholder} ${styles.shimmer}`} />
        )}
      </div>
      <div className={styles.rowScroller}>
        {Array.from({ length: count }).map((_, idx) => (
          <SkeletonCard key={idx} wide={wide} />
        ))}
      </div>
    </section>
  );
}

export function SkeletonHero() {
  return (
    <section className={styles.hero} aria-busy="true" aria-label="Loading featured banner">
      <div className={styles.heroStage}>
        <div className={`${styles.heroBackdrop} ${styles.shimmer}`} />
        <div className={styles.heroFadeLeft} />
        <div className={styles.heroFadeBottom} />
      </div>

      <div className={styles.heroContent}>
        <div className={`${styles.heroTitlePlaceholder} ${styles.shimmer}`} />
        <div className={styles.heroMetaRow}>
          <div className={`${styles.heroMetaPill} ${styles.shimmer}`} />
          <div className={`${styles.heroMetaPill} ${styles.shimmer}`} />
          <div className={`${styles.heroMetaPill} ${styles.shimmer}`} />
        </div>
        <div className={styles.heroDescPlaceholder}>
          <div className={`${styles.heroDescLine1} ${styles.shimmer}`} />
          <div className={`${styles.heroDescLine2} ${styles.shimmer}`} />
          <div className={`${styles.heroDescLine3} ${styles.shimmer}`} />
        </div>
        <div className={styles.heroActions}>
          <div className={`${styles.heroButtonPrimary} ${styles.shimmer}`} />
          <div className={`${styles.heroButtonSecondary} ${styles.shimmer}`} />
        </div>
      </div>
    </section>
  );
}

export default {
  SkeletonCard,
  SkeletonGrid,
  SkeletonRow,
  SkeletonHero,
};
