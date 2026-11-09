import { useEffect, useRef, useState } from "react";
import styles from "./Ambilight.module.css";

const W = 64; // width sample size
const H = 36; // height sample size (16:9)
const BLACK_THRESHOLD = 14; // luminance threshold for black bar detection (0-255)
const MIN_SAMPLE_INTERVAL = 40; // ~25 fps max throttle for requestAnimationFrame

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * YouTube-style Ambient Lighting component (inspired by WesselKroos/youtube-ambilight)
 *
 * Modernized features:
 * 1. Full-bleed atmospheric radiance spanning pageShell with zero hard side cutoffs
 * 2. Multi-tier projector layers (Inner, Mid, Outer) for graduated, feathered dispersion
 * 3. Dynamic focal tracking locking the glow epicenter to the player center
 * 4. Real-time black bar / letterbox & pillarbox detection
 * 5. GPU-accelerated canvas alpha-blended temporal smoothing (zero per-pixel JS loops)
 * 6. Frame-synced sampling via requestVideoFrameCallback with rAF throttle fallback
 * 7. Visibility & IntersectionObserver suspension when hidden or scrolled offscreen
 * 8. Live tab-capture bounding-box cropping preventing ambient feedback loops
 * 9. Seamless cross-fading fallback to TMDB backdrops when live source is absent
 */
export default function Ambilight({
  videoEl = null,
  images = [],
  intensity = 0.48,
  anchorRef = null,
  getCropRect = null,
  enabled = true,
  onLiveChange = null,
}) {
  const rootRef = useRef(null);
  const innerRef = useRef(null);
  const midRef = useRef(null);
  const outerRef = useRef(null);

  const [live, setLive] = useState(false);
  const [idx, setIdx] = useState(0);
  const list = images.filter(Boolean).slice(0, 4);

  // Inform parent of live state changes
  useEffect(() => {
    onLiveChange?.(live);
  }, [live, onLiveChange]);

  // ---- Dynamic focal tracking: anchor glow epicenter to video player ----
  useEffect(() => {
    if (!anchorRef?.current) return;

    const updatePosition = () => {
      const el = anchorRef.current;
      const root = rootRef.current;
      if (!el || !root) return;

      const r = el.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const centerX = r.left + r.width / 2 - rootRect.left;
      const centerY = r.top + r.height / 2 - rootRect.top;

      if (Number.isFinite(centerX) && Number.isFinite(centerY)) {
        root.style.setProperty("--focus-x", `${Math.round(centerX)}px`);
        root.style.setProperty("--focus-y", `${Math.round(centerY)}px`);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition, { passive: true });
    window.addEventListener("scroll", updatePosition, { passive: true });

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updatePosition);
      ro.observe(anchorRef.current);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
      ro?.disconnect();
    };
  }, [anchorRef]);

  // ---- LIVE MODE: Modernized Frame-Synced Sampler with Alpha-Blended Compositing ----
  useEffect(() => {
    setLive(false);
    if (!videoEl || !enabled || reduced()) return;

    const innerCanvas = innerRef.current;
    const midCanvas = midRef.current;
    const outerCanvas = outerRef.current;
    if (!innerCanvas || !midCanvas || !outerCanvas) return;

    // Set canvas internal resolutions
    innerCanvas.width = W; innerCanvas.height = H;
    midCanvas.width = W;   midCanvas.height = H;
    outerCanvas.width = W; outerCanvas.height = H;

    const innerCtx = innerCanvas.getContext("2d");
    const midCtx = midCanvas.getContext("2d");
    const outerCtx = outerCanvas.getContext("2d");

    // Offscreen sampling canvas
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = W;
    sampleCanvas.height = H;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    // Smoothed output canvas (uses canvas alpha compositing for GPU-accelerated EMA smoothing)
    const smoothCanvas = document.createElement("canvas");
    smoothCanvas.width = W;
    smoothCanvas.height = H;
    const smoothCtx = smoothCanvas.getContext("2d");

    let stopped = false;
    let vfcId = null;
    let rAFId = null;
    let hasSmoothBase = false;
    let isIntersecting = true;
    let lastTime = 0;

    // Smoothed black bar crops: [top, bottom, left, right] in 0..0.4
    let cropTop = 0;
    let cropBottom = 0;
    let cropLeft = 0;
    let cropRight = 0;

    // IntersectionObserver to halt sampling when player is scrolled out of viewport
    let observer = null;
    if (typeof IntersectionObserver !== "undefined" && anchorRef?.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]) isIntersecting = entries[0].isIntersecting;
        },
        { threshold: 0.05 }
      );
      observer.observe(anchorRef.current);
    }

    const processFrame = () => {
      if (stopped) return;

      const now = performance.now();
      // Throttle rAF fallback to ~25fps to save CPU/GPU cycles
      if (!videoEl.requestVideoFrameCallback && now - lastTime < MIN_SAMPLE_INTERVAL) {
        scheduleNext();
        return;
      }
      lastTime = now;

      // Only sample when active in viewport, tab visible, and video playing
      if (!document.hidden && isIntersecting && !videoEl.paused && videoEl.readyState >= 2) {
        try {
          const vw = videoEl.videoWidth || W;
          const vh = videoEl.videoHeight || H;

          if (vw > 10 && vh > 10) {
            // Apply bounding box cropping if sampling from tab capture
            let baseSx = 0;
            let baseSy = 0;
            let baseSw = vw;
            let baseSh = vh;

            if (getCropRect) {
              const rect = getCropRect();
              if (rect && rect.width > 20 && rect.height > 20) {
                baseSx = Math.max(0, Math.min(vw - 20, rect.x));
                baseSy = Math.max(0, Math.min(vh - 20, rect.y));
                baseSw = Math.max(20, Math.min(vw - baseSx, rect.width));
                baseSh = Math.max(20, Math.min(vh - baseSy, rect.height));
              }
            }

            // Step 1: Detect black bars on a small initial sample
            sampleCtx.drawImage(videoEl, baseSx, baseSy, baseSw, baseSh, 0, 0, W, H);
            const rawData = sampleCtx.getImageData(0, 0, W, H).data;

            // Black bar scan: Top
            let detectedTop = 0;
            for (let y = 0; y < Math.floor(H * 0.4); y++) {
              let isBlack = true;
              for (let x = Math.floor(W * 0.15); x < Math.floor(W * 0.85); x += 4) {
                const i = (y * W + x) * 4;
                if (rawData[i] > BLACK_THRESHOLD || rawData[i + 1] > BLACK_THRESHOLD || rawData[i + 2] > BLACK_THRESHOLD) {
                  isBlack = false;
                  break;
                }
              }
              if (!isBlack) {
                detectedTop = y / H;
                break;
              }
            }

            // Black bar scan: Bottom
            let detectedBottom = 0;
            for (let y = H - 1; y >= Math.floor(H * 0.6); y--) {
              let isBlack = true;
              for (let x = Math.floor(W * 0.15); x < Math.floor(W * 0.85); x += 4) {
                const i = (y * W + x) * 4;
                if (rawData[i] > BLACK_THRESHOLD || rawData[i + 1] > BLACK_THRESHOLD || rawData[i + 2] > BLACK_THRESHOLD) {
                  isBlack = false;
                  break;
                }
              }
              if (!isBlack) {
                detectedBottom = (H - 1 - y) / H;
                break;
              }
            }

            // Pillarbox scan: Left
            let detectedLeft = 0;
            for (let x = 0; x < Math.floor(W * 0.35); x++) {
              let isBlack = true;
              for (let y = Math.floor(H * 0.15); y < Math.floor(H * 0.85); y += 4) {
                const i = (y * W + x) * 4;
                if (rawData[i] > BLACK_THRESHOLD || rawData[i + 1] > BLACK_THRESHOLD || rawData[i + 2] > BLACK_THRESHOLD) {
                  isBlack = false;
                  break;
                }
              }
              if (!isBlack) {
                detectedLeft = x / W;
                break;
              }
            }

            // Pillarbox scan: Right
            let detectedRight = 0;
            for (let x = W - 1; x >= Math.floor(W * 0.65); x--) {
              let isBlack = true;
              for (let y = Math.floor(H * 0.15); y < Math.floor(H * 0.85); y += 4) {
                const i = (y * W + x) * 4;
                if (rawData[i] > BLACK_THRESHOLD || rawData[i + 1] > BLACK_THRESHOLD || rawData[i + 2] > BLACK_THRESHOLD) {
                  isBlack = false;
                  break;
                }
              }
              if (!isBlack) {
                detectedRight = (W - 1 - x) / W;
                break;
              }
            }

            // Smooth crop transitions to prevent sudden jumping
            cropTop = cropTop * 0.85 + detectedTop * 0.15;
            cropBottom = cropBottom * 0.85 + detectedBottom * 0.15;
            cropLeft = cropLeft * 0.85 + detectedLeft * 0.15;
            cropRight = cropRight * 0.85 + detectedRight * 0.15;

            // Step 2: Draw the active picture area
            const activeSx = baseSx + baseSw * cropLeft;
            const activeSy = baseSy + baseSh * cropTop;
            const activeSw = Math.max(1, baseSw * (1 - cropLeft - cropRight));
            const activeSh = Math.max(1, baseSh * (1 - cropTop - cropBottom));

            sampleCtx.drawImage(videoEl, activeSx, activeSy, activeSw, activeSh, 0, 0, W, H);

            // Step 3: GPU-accelerated canvas alpha-blended temporal smoothing (exponential moving average)
            if (!hasSmoothBase) {
              smoothCtx.globalAlpha = 1.0;
              smoothCtx.drawImage(sampleCanvas, 0, 0, W, H);
              hasSmoothBase = true;
            } else {
              smoothCtx.globalAlpha = 0.22; // 22% new frame, 78% previous frame: silky anti-flicker
              smoothCtx.drawImage(sampleCanvas, 0, 0, W, H);
            }

            // Step 4: Render onto the 3 multi-tier projector canvases
            innerCtx.drawImage(smoothCanvas, 0, 0, W, H);
            midCtx.drawImage(smoothCanvas, 0, 0, W, H);
            outerCtx.drawImage(smoothCanvas, 0, 0, W, H);

            setLive(true);
          }
        } catch {
          // If video is tainted by cross-origin CORS or iframe, cleanly fall back to backdrops
          setLive(false);
          return;
        }
      }

      scheduleNext();
    };

    const scheduleNext = () => {
      if (stopped) return;
      if (typeof videoEl.requestVideoFrameCallback === "function") {
        vfcId = videoEl.requestVideoFrameCallback(processFrame);
      } else {
        rAFId = requestAnimationFrame(processFrame);
      }
    };

    scheduleNext();

    return () => {
      stopped = true;
      observer?.disconnect();
      if (vfcId && typeof videoEl.cancelVideoFrameCallback === "function") {
        videoEl.cancelVideoFrameCallback(vfcId);
      }
      if (rAFId) {
        cancelAnimationFrame(rAFId);
      }
    };
  }, [videoEl, enabled, getCropRect, anchorRef]);

  // ---- FALLBACK: slow cross-fade between backdrops ----
  useEffect(() => {
    if (live || !enabled || list.length < 2 || reduced()) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), 9000);
    return () => clearInterval(t);
  }, [live, enabled, list.length]);

  if (!enabled) return null;

  return (
    <div
      ref={rootRef}
      className={styles.ambient}
      aria-hidden="true"
      style={{ "--ambient-opacity": intensity }}
    >
      {/* Fallback backdrop images for iframe embeds */}
      {list.map((src, i) => (
        <div
          key={src}
          className={`${styles.img} ${!live && i === idx % list.length ? styles.imgOn : ""}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}

      {/* Multi-tier YouTube Ambilight projectors */}
      <canvas
        ref={outerRef}
        className={`${styles.projector} ${styles.projectorOuter} ${live ? styles.liveOn : ""}`}
      />
      <canvas
        ref={midRef}
        className={`${styles.projector} ${styles.projectorMid} ${live ? styles.liveOn : ""}`}
      />
      <canvas
        ref={innerRef}
        className={`${styles.projector} ${styles.projectorInner} ${live ? styles.liveOn : ""}`}
      />
    </div>
  );
}
