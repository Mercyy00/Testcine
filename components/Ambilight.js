import { useEffect, useRef, useState } from "react";
import styles from "./Ambilight.module.css";

const W = 48, H = 27;           // sample size: tiny on purpose
const HISTORY = 6;              // frames averaged to avoid flicker
const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * <Ambilight videoEl={HTMLVideoElement|null} images={[urls]} intensity={0.45} />
 *  - videoEl: real <video> element (own HLS player). null for iframe embeds.
 *  - images:  backdrop URLs for the fallback (first one is enough; more = slow cross-fade).
 */
export default function Ambilight({ videoEl = null, images = [], intensity = 0.45 }) {
  const canvasRef = useRef(null);
  const [live, setLive] = useState(false);
  const [idx, setIdx] = useState(0);
  const list = images.filter(Boolean).slice(0, 4);

  // ---- LIVE MODE: sample the playing video ----
  useEffect(() => {
    setLive(false);
    const canvas = canvasRef.current;
    if (!videoEl || !canvas || reduced()) return;
    canvas.width = W; canvas.height = H;
    const out = canvas.getContext("2d");
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const sctx = off.getContext("2d", { willReadFrequently: true });
    const hist = [];
    let stopped = false, timer = null, failed = false;

    const tick = () => {
      if (stopped) return;
      if (!document.hidden && !videoEl.paused && videoEl.readyState >= 2) {
        try {
          sctx.drawImage(videoEl, 0, 0, W, H);
          hist.push(new Uint8ClampedArray(sctx.getImageData(0, 0, W, H).data)); // SecurityError if no CORS
          if (hist.length > HISTORY) hist.shift();
          const img = out.createImageData(W, H);
          for (let i = 0; i < img.data.length; i += 4) {
            let r = 0, g = 0, b = 0;
            for (const f of hist) { r += f[i]; g += f[i + 1]; b += f[i + 2]; }
            const n = hist.length;
            img.data[i] = r / n; img.data[i + 1] = g / n; img.data[i + 2] = b / n; img.data[i + 3] = 255;
          }
          out.putImageData(img, 0, 0);
          if (!failed) setLive(true);
        } catch { failed = true; setLive(false); return; }   // fall back to images
      }
      timer = setTimeout(tick, 160);                           // ~6 fps
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, [videoEl]);

  // ---- FALLBACK: slow cross-fade between backdrops ----
  useEffect(() => {
    if (live || list.length < 2 || reduced()) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), 9000);
    return () => clearInterval(t);
  }, [live, list.length]);

  return (
    <div className={styles.ambient} aria-hidden="true" style={{ "--ambient-opacity": intensity }}>
      {list.map((src, i) => (
        <div
          key={src}
          className={`${styles.img} ${!live && i === idx % list.length ? styles.imgOn : ""}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <canvas ref={canvasRef} className={`${styles.live} ${live ? styles.liveOn : ""}`} />
    </div>
  );
}
