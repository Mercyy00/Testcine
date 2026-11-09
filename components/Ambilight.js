import { useEffect, useRef, useState } from "react";
import styles from "./Ambilight.module.css";

const NEUTRAL = ["#2a2a2e", "#1c1c20", "#26262b", "#18181b"];

// Average colour of a region of a small canvas, with a subtle saturation boost.
function avg(data, w, x0, y0, x1, y1) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  r /= n;
  g /= n;
  b /= n;
  const m = (r + g + b) / 3;
  const s = 1.1; // subtle saturation boost
  const c = (v) => Math.max(0, Math.min(255, Math.round(m + (v - m) * s)));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

// Four quadrant colours of an image (TMDB images send CORS headers, so this is allowed).
function useBackdropColors(src) {
  const [colors, setColors] = useState(NEUTRAL);

  useEffect(() => {
    if (!src) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 16;
        c.height = 9;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 16, 9);
        const d = ctx.getImageData(0, 0, 16, 9).data;
        if (alive) {
          setColors([
            avg(d, 16, 0, 0, 8, 5),
            avg(d, 16, 8, 0, 16, 5),
            avg(d, 16, 0, 4, 8, 9),
            avg(d, 16, 8, 4, 16, 9),
          ]);
        }
      } catch {
        /* tainted canvas: keep neutral */
      }
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  return colors;
}

/**
 * <Ambilight videoEl={HTMLVideoElement | null} image={backdropUrl} intensity={number} />
 * videoEl: pass the real <video> element when you have one (our HLS player). Pass null for iframe embeds.
 */
export default function Ambilight({ videoEl = null, image, intensity = 0.3 }) {
  const canvasRef = useRef(null);
  const [live, setLive] = useState(false);
  const colors = useBackdropColors(image);

  useEffect(() => {
    setLive(false);
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    canvas.width = 32;
    canvas.height = 18; // tiny on purpose: cheap and the blur hides the pixels

    // Offscreen canvas to safely sample video frames and read pixel data
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 32;
    sampleCanvas.height = 18;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    let stopped = false;
    let timer = null;
    let failed = false;

    // Running history buffer of the last 8 samples (5-10 samples) for temporal smoothing
    const MAX_SAMPLES = 8;
    const sampleHistory = [];

    const draw = () => {
      if (stopped) return;
      if (!document.hidden && !videoEl.paused && videoEl.readyState >= 2) {
        try {
          sampleCtx.drawImage(videoEl, 0, 0, 32, 18);
          const frameImgData = sampleCtx.getImageData(0, 0, 32, 18); // throws SecurityError if cross-origin without CORS
          const frameData = frameImgData.data;

          sampleHistory.push(new Uint8ClampedArray(frameData));
          if (sampleHistory.length > MAX_SAMPLES) {
            sampleHistory.shift();
          }

          // Smooth colour changes by averaging the last samples so glow does not flicker on fast cuts
          const count = sampleHistory.length;
          const avgImgData = ctx.createImageData(32, 18);
          const avgData = avgImgData.data;
          const len = avgData.length;

          for (let i = 0; i < len; i += 4) {
            let sumR = 0;
            let sumG = 0;
            let sumB = 0;
            for (let s = 0; s < count; s++) {
              sumR += sampleHistory[s][i];
              sumG += sampleHistory[s][i + 1];
              sumB += sampleHistory[s][i + 2];
            }
            avgData[i] = Math.round(sumR / count);
            avgData[i + 1] = Math.round(sumG / count);
            avgData[i + 2] = Math.round(sumB / count);
            avgData[i + 3] = 255;
          }

          ctx.putImageData(avgImgData, 0, 0);

          if (!failed) setLive(true);
        } catch {
          failed = true;
          setLive(false);
          return; // fall back to image colours, stop sampling
        }
      }
      timer = setTimeout(draw, 200); // ~5 fps
    };

    draw();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [videoEl]);

  return (
    <div className={styles.ambient} aria-hidden="true" style={{ "--ambient-opacity": intensity }}>
      {/* fallback glow from backdrop colours */}
      <div
        className={`${styles.glow} ${live ? styles.glowHidden : ""}`}
        style={{ "--c1": colors[0], "--c2": colors[1], "--c3": colors[2], "--c4": colors[3] }}
      />
      {/* live glow from video frames */}
      <canvas ref={canvasRef} className={`${styles.live} ${live ? styles.liveShown : ""}`} />
      <div className={styles.vignette} />
    </div>
  );
}
