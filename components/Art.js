import { useId, useState } from "react";

// Real TMDB image with graceful SVG fallback.
const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;

function lines(title = "") {
  const words = title.toUpperCase().split(" ");
  const out = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 9 && cur) {
      out.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) out.push(cur);
  return out.slice(0, 4);
}

function Motif({ kind, w, h, h1, h2 }) {
  const dark = hsl(h2, 55, 7);
  const mid = hsl(h2, 45, 14);
  const lit = hsl(h1, 70, 62, 0.9);
  switch (kind) {
    case 0: // ridge
      return (
        <g>
          <circle cx={w * 0.7} cy={h * 0.38} r={w * 0.14} fill={lit} opacity="0.55" />
          <path d={`M0 ${h * 0.62} L${w * 0.18} ${h * 0.44} L${w * 0.34} ${h * 0.58} L${w * 0.52} ${h * 0.36} L${w * 0.7} ${h * 0.6} L${w * 0.86} ${h * 0.48} L${w} ${h * 0.6} V${h} H0Z`} fill={mid} />
          <path d={`M0 ${h * 0.76} L${w * 0.22} ${h * 0.6} L${w * 0.44} ${h * 0.74} L${w * 0.64} ${h * 0.56} L${w * 0.82} ${h * 0.72} L${w} ${h * 0.64} V${h} H0Z`} fill={dark} />
        </g>
      );
    case 1: // sun
      return (
        <g>
          <circle cx={w * 0.5} cy={h * 0.44} r={w * 0.26} fill={lit} opacity="0.85" />
          <circle cx={w * 0.5} cy={h * 0.44} r={w * 0.38} fill="none" stroke={lit} strokeOpacity="0.28" strokeWidth={w * 0.012} />
          <rect x="0" y={h * 0.68} width={w} height={h * 0.32} fill={dark} />
        </g>
      );
    case 2: // slats
      return (
        <g>
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x={(i * w) / 9} y="0" width={w / 9 - w * 0.012} height={h} fill={i % 2 ? mid : dark} opacity={0.35 + (i % 3) * 0.12} />
          ))}
          <circle cx={w * 0.36} cy={h * 0.4} r={w * 0.18} fill={lit} opacity="0.7" />
        </g>
      );
    case 3: // skyline
      return (
        <g>
          {[0.04, 0.16, 0.27, 0.39, 0.5, 0.62, 0.74, 0.86].map((x, i) => {
            const bh = h * (0.28 + ((i * 37) % 30) / 100);
            return <rect key={i} x={w * x} y={h - bh} width={w * 0.1} height={bh} fill={i % 2 ? dark : mid} />;
          })}
          <circle cx={w * 0.74} cy={h * 0.3} r={w * 0.1} fill={lit} opacity="0.8" />
        </g>
      );
    case 4: // waves
      return (
        <g>
          {[0.52, 0.62, 0.72, 0.82].map((y, i) => (
            <path key={i} d={`M0 ${h * y} Q${w * 0.25} ${h * (y - 0.06)} ${w * 0.5} ${h * y} T${w} ${h * y} V${h} H0Z`} fill={i % 2 ? dark : mid} opacity={0.55 + i * 0.12} />
          ))}
          <circle cx={w * 0.3} cy={h * 0.32} r={w * 0.12} fill={lit} opacity="0.75" />
        </g>
      );
    default: // rings
      return (
        <g fill="none" stroke={lit}>
          {[0.1, 0.2, 0.3, 0.4].map((r, i) => (
            <circle key={i} cx={w * 0.5} cy={h * 0.42} r={w * r} strokeOpacity={0.55 - i * 0.1} strokeWidth={w * 0.012} />
          ))}
          <circle cx={w * 0.5} cy={h * 0.42} r={w * 0.04} fill={lit} stroke="none" />
          <rect x="0" y={h * 0.72} width={w} height={h * 0.28} fill={dark} stroke="none" opacity="0.8" />
        </g>
      );
  }
}

export default function Art({ title, variant = "poster", showTitle = true, className, style, priority = false }) {
  const uid = useId().replace(/:/g, "");
  const [triedAlt, setTriedAlt] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!title) return null;

  const poster = variant === "poster";
  const primaryUrl = poster
    ? title.poster || title.backdrop
    : title.backdrop || title.poster;
  const altUrl = poster ? title.backdrop : title.poster;
  const activeUrl = triedAlt ? altUrl : primaryUrl;

  if (activeUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={activeUrl}
        alt={title.title || "Media title"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => {
          if (!triedAlt && altUrl && altUrl !== primaryUrl) {
            setTriedAlt(true);
          } else {
            setFailed(true);
          }
        }}
        className={className}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          ...style,
        }}
      />
    );
  }

  const [h1, h2] = title.hues || [210, 260];
  const w = poster ? 200 : 1600;
  const h = poster ? 300 : 900;
  const ls = lines(title.title || "");
  const longest = Math.max(1, ...ls.map((l) => l.length));
  const fs = poster ? Math.min(30, Math.floor(172 / (longest * 0.64))) : 80;

  return (
    <svg
      className={className}
      style={style}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={title.title}
    >
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor={hsl(h1, 58, 34)} />
          <stop offset="0.6" stopColor={hsl(h2, 52, 16)} />
          <stop offset="1" stopColor={hsl(h2, 50, 6)} />
        </linearGradient>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#g${uid})`} />
      <Motif kind={title.motif ?? 0} w={w} h={h} h1={h1} h2={h2} />
      {poster && <rect width={w} height={h} fill={`url(#s${uid})`} />}
      {poster && showTitle && (
        <g fontFamily="var(--font-body)" fontWeight="800" fill="#fff" letterSpacing="-0.5">
          {ls.map((l, i) => (
            <text key={i} x="14" y={h - 16 - (ls.length - 1 - i) * (fs + 3)} fontSize={fs}>
              {l}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
