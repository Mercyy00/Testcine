import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import Art from "./Art";
import { RatingRing, CertBadge, Dot } from "./Meta";
import { runtimeLabel } from "../lib/constants";
import { useSettings } from "../lib/store";
import styles from "./HeroBanner.module.css";

const copyVariants = {
  initial: {
    opacity: 0,
    x: -50,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    x: -40,
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const childVariants = {
  initial: {
    opacity: 0,
    x: -25,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.22,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const backdropVariants = {
  initial: {
    opacity: 0,
    scale: 1.05,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function Wordmark({ title, isPerformance }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const titleStr =
    typeof title?.title === "string"
      ? title.title
      : typeof title?.name === "string"
      ? title.name
      : String(title?.title || title || "");

  const words = titleStr ? titleStr.toUpperCase().split(" ") : [];
  const stack = words.length <= 3 && title?.type === "movie";

  if (isPerformance) {
    if (title?.logo && !logoFailed) {
      return (
        <h1 className={styles.logoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={title.logo}
            alt={titleStr}
            className={styles.logoImg}
            onError={() => setLogoFailed(true)}
          />
          <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", border: 0 }}>
            {titleStr}
          </span>
        </h1>
      );
    }
    return (
      <h1 className={`${styles.mark} ${stack ? styles.markStack : styles.markWide}`} aria-label={titleStr}>
        {stack ? words.map((w, i) => <span key={i}>{w}</span>) : (titleStr ? titleStr.toUpperCase() : "")}
      </h1>
    );
  }

  if (title?.logo && !logoFailed) {
    return (
      <motion.h1 variants={childVariants} className={styles.logoWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={title.logo}
          alt={titleStr}
          className={styles.logoImg}
          onError={() => setLogoFailed(true)}
        />
        <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", border: 0 }}>
          {titleStr}
        </span>
      </motion.h1>
    );
  }

  return (
    <motion.h1 variants={childVariants} className={`${styles.mark} ${stack ? styles.markStack : styles.markWide}`} aria-label={titleStr}>
      {stack ? words.map((w, i) => <span key={i}>{w}</span>) : (titleStr ? titleStr.toUpperCase() : "")}
    </motion.h1>
  );
}

export default function HeroBanner({ items = [], interval = 8000 }) {
  const validItems = items.filter(Boolean);
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [settings] = useSettings();
  const isPerformance =
    settings?.themeMode === "performance" || settings?.theme === "performance";
  const paused = hover || isFocused || settings.autoplay === false || settings.autoplayPreviews === false;
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
        {isPerformance ? (
          <div key={t.id ?? i} className={styles.backdrop}>
            <Art title={t} variant="backdrop" className={styles.art} priority />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={t.id ?? i}
              className={styles.backdrop}
              variants={backdropVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Art title={t} variant="backdrop" className={styles.art} priority />
            </motion.div>
          </AnimatePresence>
        )}
        <div className={styles.fadeLeft} />
        <div className={styles.fadeBottom} />
      </div>

      <div className={styles.content}>
        {isPerformance ? (
          <div key={t.id ?? i} className={styles.copy}>
            <Wordmark title={t} isPerformance={true} />
            <div className={styles.meta}>
              <RatingRing value={t.rating} size={38} />
              <Dot />
              <span>{t.year}</span>
              <Dot />
              <span>{runtimeLabel(t)}</span>
              <Dot />
              <CertBadge cert={t.cert} />
              <Dot />
              <span>HD</span>
            </div>
            <p className={styles.overview}>{t.overview}</p>
            <div className={styles.actions}>
              <Link
                href={t.type === "movie" ? `/watch/${t.id}` : `/watch/${t.id}?season=1&episode=1`}
                className={styles.playBtn}
              >
                <Play size={16} fill="currentColor" stroke="none" />
                <span>Play</span>
              </Link>
              <Link
                href={`/title/${t.id}`}
                className={styles.detailsBtn}
              >
                <span>Details</span>
              </Link>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={t.id ?? i}
              className={styles.copy}
              variants={copyVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Wordmark title={t} isPerformance={false} />
              <motion.div variants={childVariants} className={styles.meta}>
                <RatingRing value={t.rating} size={38} />
                <Dot />
                <span>{t.year}</span>
                <Dot />
                <span>{runtimeLabel(t)}</span>
                <Dot />
                <CertBadge cert={t.cert} />
                <Dot />
                <span>HD</span>
              </motion.div>
              <motion.p variants={childVariants} className={styles.overview}>
                {t.overview}
              </motion.p>
              <motion.div variants={childVariants} className={styles.actions}>
                <Link
                  href={t.type === "movie" ? `/watch/${t.id}` : `/watch/${t.id}?season=1&episode=1`}
                  className={styles.playBtn}
                >
                  <Play size={16} fill="currentColor" stroke="none" />
                  <span>Play</span>
                </Link>
                <Link
                  href={`/title/${t.id}`}
                  className={styles.detailsBtn}
                >
                  <span>Details</span>
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className={styles.pager}>
        <button type="button" className={styles.arrow} onClick={() => go(i - 1)} aria-label="Previous title">
          <ChevronLeft size={18} strokeWidth={2.4} />
        </button>
        <div className={styles.dots} role="tablist" aria-label="Choose title">
          {validItems.map((it, idx) => (
            <button
              key={it.id ?? idx}
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
          <ChevronRight size={18} strokeWidth={2.4} />
        </button>
      </div>
    </section>
  );
}
