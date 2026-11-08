// Neutral generated avatars (SVG data URIs): no third-party or copyrighted images.
const PALETTES = [
  ["#6366f1", "#8b5cf6"], ["#0ea5e9", "#22d3ee"], ["#10b981", "#84cc16"], ["#f59e0b", "#ef4444"],
  ["#ec4899", "#f43f5e"], ["#14b8a6", "#3b82f6"], ["#a855f7", "#ec4899"], ["#64748b", "#334155"],
];

export function makeAvatar(name = "Guest", index = 0) {
  const p = PALETTES[Math.abs(index) % PALETTES.length];
  const letter = (String(name).trim()[0] || "G").toUpperCase().replace(/[<>&"']/g, "G");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="78" font-family="Arial,sans-serif" font-size="56" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_AVATAR = makeAvatar("G", 0);

export const PROFILE_AVATARS = ["Aurora", "Breeze", "Cedar", "Dusk", "Ember", "Fjord", "Glow", "Harbor"].map(
  (name, i) => ({ id: name.toLowerCase(), name, url: makeAvatar(name, i) })
);
