import { useEffect, useRef, useState } from "react";
import styles from "./Ambilight.module.css";

const NEUTRAL = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981"];

// Average colour of a region of a small canvas, with saturation & brightness boost so glow is vibrant.
function avg(data, w, x0, y0, x1, y1) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  r /= n; g /= n; b /= n;
  const m = (r + g + b) / 3;
  const s = 1.6; // vibrant saturation boost
  let cr = m + (r - m) * s;
  let cg = m + (g - m) * s;
  let cb = m + (b - m) * s;

  // Luminance floor boost: ensure dark/moody scenes still produce vibrant glowing color
  const lum = cr * 0.299 + cg * 0.587 + cb * 0.114;
  if (lum < 65) {
    const boost = Math.min(3.2, 70 / Math.max(lum, 14));
    cr *= boost;
    cg *= boost;
    cb *= boost;
  }

  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(cr)}, ${clamp(cg)}, ${clamp(cb)})`;
}

// Four quadrant colours of an image (TMDB images send CORS headers, so this is allowed).
function useBackdropColors(src, hues) {
  const initialColors = hues && hues.length >= 2
    ? [
        `hsl(${hues[0]}, 85%, 52%)`,
        `hsl(${hues[1]}, 80%, 48%)`,
        `hsl(${(hues[0] + 40) % 360}, 80%, 46%)`,
        `hsl(${(hues[1] + 40) % 360}, 80%, 44%)`,
      ]
    : NEUTRAL;

  const [colors, setColors] = useState(initialColors);

  useEffect(() => {
    if (!src) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 16; c.height = 9;
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
      } catch { /* tainted canvas: keep vibrant initial colors */ }
    };
    img.onerror = () => { /* keep vibrant initial colors */ };
    img.src = src;
    return () => { alive = false; };
  }, [src]);

  return colors;
}

/**
 * <Ambilight videoEl={HTMLVideoElement | null} image={backdropUrl} hues={number[] | null} intensity={number} />
 * videoEl: pass the real <video> element when you have one (our HLS player). Pass null for iframe embeds.
 */
export default function Ambilight({ videoEl = null, image, hues = null, intensity = 0.75 }) {
  const canvasRef = useRef(null);
  const [live, setLive] = useState(false);
  const colors = useBackdropColors(image, hues);

  useEffect(() => {
    setLive(false);
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    canvas.width = 32; canvas.height = 18; // tiny on purpose: cheap and the blur hides the pixels
    let stopped = false, timer = null, failed = false;

    const draw = () => {
      if (stopped) return;
      if (!document.hidden && !videoEl.paused && videoEl.readyState >= 2) {
        try {
          ctx.drawImage(videoEl, 0, 0, 32, 18);
          ctx.getImageData(0, 0, 1, 1); // throws SecurityError if the video is cross-origin without CORS
          if (!failed) setLive(true);
        } catch {
          failed = true; setLive(false); return; // fall back to image colours, stop sampling
        }
      }
      timer = setTimeout(draw, 200); // ~5 fps
    };
    draw();
    return () => { stopped = true; clearTimeout(timer); };
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
