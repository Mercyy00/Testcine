import { useEffect, useRef, useState } from "react";
import styles from "./Ambilight.module.css";

const W = 64; // width sample size
const H = 36; // height sample size (16:9)
const HISTORY = 6; // frame history buffer for temporal anti-flicker
const BLACK_THRESHOLD = 14; // luminance threshold for black bar detection (0-255)

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * YouTube-style Ambient Lighting component (inspired by WesselKroos/youtube-ambilight)
 *
 * Features:
 * 1. Multi-tier projector layers (Inner, Mid, Outer) for graduated, feathered dispersion
 * 2. Real-time black bar / letterbox & pillarbox detection so glow syncs to active picture
 * 3. Temporal rolling-average frame blending to eliminate flicker and strobing
 * 4. Fallback backdrop cross-fading for iframe embed servers without CORS
 * 5. Page-isolated ambient halo behind the video player
 */
export default function Ambilight({
  videoEl = null,
  images = [],
  intensity = 0.45,
}) {
  const innerRef = useRef(null);
  const midRef = useRef(null);
  const outerRef = useRef(null);

  const [live, setLive] = useState(false);
  const [idx, setIdx] = useState(0);
  const list = images.filter(Boolean).slice(0, 4);

  // ---- LIVE MODE: YouTube Ambilight multi-layer projector + bar detection ----
  useEffect(() => {
    setLive(false);
    if (!videoEl || reduced()) return;

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

    // Smoothed output canvas
    const smoothCanvas = document.createElement("canvas");
    smoothCanvas.width = W;
    smoothCanvas.height = H;
    const smoothCtx = smoothCanvas.getContext("2d");

    const hist = [];
    let stopped = false;
    let timer = null;
    let failed = false;

    // Smoothed black bar crops: [top, bottom, left, right] in 0..0.4
    let cropTop = 0;
    let cropBottom = 0;
    let cropLeft = 0;
    let cropRight = 0;

    const tick = () => {
      if (stopped) return;

      if (!document.hidden && !videoEl.paused && videoEl.readyState >= 2) {
        try {
          const vw = videoEl.videoWidth || W;
          const vh = videoEl.videoHeight || H;

          // Step 1: Detect black bars on a small initial sample
          sampleCtx.drawImage(videoEl, 0, 0, W, H);
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

          // Smooth crop transition to prevent jumping
          cropTop = cropTop * 0.85 + detectedTop * 0.15;
          cropBottom = cropBottom * 0.85 + detectedBottom * 0.15;
          cropLeft = cropLeft * 0.85 + detectedLeft * 0.15;
          cropRight = cropRight * 0.85 + detectedRight * 0.15;

          // Step 2: Draw the cropped active picture area
          const sx = vw * cropLeft;
          const sy = vh * cropTop;
          const sw = Math.max(1, vw * (1 - cropLeft - cropRight));
          const sh = Math.max(1, vh * (1 - cropTop - cropBottom));

          sampleCtx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, W, H);
          const croppedData = sampleCtx.getImageData(0, 0, W, H).data;

          // Step 3: Rolling temporal smoothing across frames
          hist.push(new Uint8ClampedArray(croppedData));
          if (hist.length > HISTORY) hist.shift();

          const blended = smoothCtx.createImageData(W, H);
          const len = blended.data.length;
          const n = hist.length;

          for (let i = 0; i < len; i += 4) {
            let r = 0, g = 0, b = 0;
            for (let h = 0; h < n; h++) {
              r += hist[h][i];
              g += hist[h][i + 1];
              b += hist[h][i + 2];
            }
            blended.data[i] = r / n;
            blended.data[i + 1] = g / n;
            blended.data[i + 2] = b / n;
            blended.data[i + 3] = 255;
          }
          smoothCtx.putImageData(blended, 0, 0);

          // Step 4: Render to the 3 multi-tier projector canvases
          innerCtx.drawImage(smoothCanvas, 0, 0, W, H);
          midCtx.drawImage(smoothCanvas, 0, 0, W, H);
          outerCtx.drawImage(smoothCanvas, 0, 0, W, H);

          if (!failed) setLive(true);
        } catch {
          // If video is tainted by cross-origin CORS or iframe, cleanly fall back to backdrop images
          failed = true;
          setLive(false);
          return;
        }
      }

      timer = setTimeout(tick, 100); // ~10-12 fps: silky smooth, highly responsive, zero lag
    };

    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [videoEl]);

  // ---- FALLBACK: slow cross-fade between backdrops ----
  useEffect(() => {
    if (live || list.length < 2 || reduced()) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), 9000);
    return () => clearInterval(t);
  }, [live, list.length]);

  return (
    <div
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
