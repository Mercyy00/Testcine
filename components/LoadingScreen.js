import styles from "./LoadingScreen.module.css";

export default function LoadingScreen({
  message = "Loading…",
  fullScreen = false,
  minHeight = "60vh",
  size = "md",
  className = "",
}) {
  return (
    <div
      className={`${styles.container} ${fullScreen ? styles.fullScreen : ""} ${className}`}
      style={!fullScreen ? { minHeight } : undefined}
      role="status"
      aria-live="polite"
    >
      <div className={`${styles.loaderCard} ${styles[size] || styles.md}`}>
        <div className={styles.glowAura} aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/loader-leaf.gif"
          alt="Loading..."
          className={styles.leafImg}
        />
        {message && (
          <div className={styles.messageWrap}>
            <span className={styles.messageText}>{message}</span>
            <span className={styles.dots} aria-hidden="true">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
