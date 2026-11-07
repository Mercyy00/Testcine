import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Play, Pause, Info, ChevronLeft, ChevronRight } from "lucide-react";
import Art from "./Art";
import { RatingRing, CertBadge, Dot } from "./Meta";
import { runtimeLabel } from "../lib/constants";
import { useSettings } from "../lib/store";
import styles from "./HeroBanner.module.css";

function Wordmark({ title }) {
  const [logoFailed, setLogoFailed] = useState(false);
  if (title.logo && !logoFailed) {
    return (
      <h1 className={styles.logoWrap} style={{ margin: 0, padding: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={title.logo}
          alt={title.title}
          className={styles.logoImg}
          onError={() => setLogoFailed(true)}
        />
        <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", border: 0 }}>
          {title.title}
        </span>
      </h1>
    );
  }
  const words = title.title.toUpperCase().split(" ");
  const stack = words.length <= 3 && title.type === "movie";
  return (
    <h1 className={`${styles.mark} ${stack ? styles.markStack : styles.markWide}`} aria-label={title.title}>
      {stack ? words.map((w, i) => <span key={i}>{w}</span>) : title.title.toUpperCase()}
    </h1>
  );
}

export default function HeroBanner({ items = [], interval = 8000 }) {
  const validItems = items.filter(Boolean);
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [settings] = useSettings();
  const paused = hover || isFocused || isManuallyPaused || settings.autoplay === false || settings.autoplayPreviews === false;
  const n = validItems.length;
  const go = useCallback((next) => setI(((next % n) + n) % n), [n]);

  useEffect(() => {
    if (paused || n < 2) return;
    const id = setTimeout(() => setI((x) => (x + 1) % n), interval);
    return () => clearTimeout(id);
  }, [i, paused, n, interval]);

  if (n === 0) return null;

  const t = validItems[i];

  return (
    <section
      className={styles.hero}
      aria-roledescription="carousel"
      aria-label="Featured titles"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={() => setIsFocused(false)}
    >
      <div className={styles.stage}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={t.id}
            className={styles.backdrop}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <Art title={t} variant="backdrop" className={styles.art} priority />
          </motion.div>
        </AnimatePresence>
        <div className={styles.fadeLeft} />
        <div className={styles.fadeBottom} />
      </div>

      <div className={styles.content}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={t.id}
            className={styles.copy}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Wordmark title={t} />
            <div className={styles.meta}>
              <RatingRing value={t.rating} size={56} />
              <Dot />
              <span>{t.year}</span>
              <Dot />
              <span>{runtimeLabel(t)}</span>
              <Dot />
              <CertBadge cert={t.cert} />
              {t.type === "movie" && (
                <>
                  <Dot />
                  <span>HD</span>
                </>
              )}
            </div>
            <p className={styles.overview}>{t.overview}</p>
            <div className={styles.actions}>
              <Link href={`/watch/${t.id}`} className="btnHero">
                <Play size={22} fill="currentColor" />
                Play
              </Link>
              <Link href={`/title/${t.id}`} className="btnHeroGlass">
                <Info size={22} className={styles.infoIcon} />
                Details
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.pager}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => setIsManuallyPaused((p) => !p)}
          aria-label={isManuallyPaused ? "Resume carousel autoplay" : "Pause carousel autoplay"}
          title={isManuallyPaused ? "Resume autoplay" : "Pause autoplay"}
        >
          {isManuallyPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
        </button>
        <button type="button" className={styles.arrow} onClick={() => go(i - 1)} aria-label="Previous title">
          <ChevronLeft size={18} strokeWidth={2.6} />
        </button>
        <div className={styles.dots} role="tablist" aria-label="Choose title">
          {validItems.map((it, idx) => (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={idx === i}
              aria-label={it.title}
              className={`${styles.dot} ${idx === i ? styles.dotOn : ""}`}
              onClick={() => go(idx)}
            />
          ))}
        </div>
        <button type="button" className={styles.arrow} onClick={() => go(i + 1)} aria-label="Next title">
          <ChevronRight size={18} strokeWidth={2.6} />
        </button>
      </div>
    </section>
  );
}
