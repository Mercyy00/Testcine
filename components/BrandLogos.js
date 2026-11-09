// Authentic official brand logos for streaming services and film studios
// Sourced directly from official vector artwork

export const BRAND_SVG_MAP = {
  // Services
  netflix: "/brands/netflix.svg",
  prime: "/brands/prime-video.svg",
  "prime-video": "/brands/prime-video.svg",
  amazon: "/brands/prime-video.svg",
  disney: "/brands/disney-plus.svg",
  "disney-plus": "/brands/disney-plus.svg",
  "disney+": "/brands/disney-plus.svg",
  max: "/brands/hbo-max.svg",
  hbo: "/brands/hbo-max.svg",
  "hbo-max": "/brands/hbo-max.svg",
  hulu: "/brands/hulu.svg",
  apple: "/brands/apple-tv-plus.svg",
  "apple-tv": "/brands/apple-tv-plus.svg",
  "apple-tv+": "/brands/apple-tv-plus.svg",
  "apple-tv-plus": "/brands/apple-tv-plus.svg",
  paramount: "/brands/paramount-plus.svg",
  "paramount-plus": "/brands/paramount-plus.svg",
  "paramount+": "/brands/paramount-plus.svg",

  // Studios
  marvel: "/brands/marvel.svg",
  a24: "/brands/a24.svg",
  pixar: "/brands/pixar.svg",
  ghibli: "/brands/studio-ghibli.svg",
  "studio-ghibli": "/brands/studio-ghibli.svg",
  dc: "/brands/dc.svg",
  warner: "/brands/warner-bros.svg",
  "warner-bros": "/brands/warner-bros.svg",
  universal: "/brands/universal.svg",
};

export function getBrandLogoUrl(idOrName) {
  const norm = String(idOrName || "").toLowerCase().trim().replace(/[\s_]+/g, "-");
  if (BRAND_SVG_MAP[norm]) return BRAND_SVG_MAP[norm];

  if (norm.includes("netflix")) return "/brands/netflix.svg";
  if (norm.includes("prime") || norm.includes("amazon")) return "/brands/prime-video.svg";
  if (norm.includes("disney")) return "/brands/disney-plus.svg";
  if (norm.includes("max") || norm.includes("hbo")) return "/brands/hbo-max.svg";
  if (norm.includes("hulu")) return "/brands/hulu.svg";
  if (norm.includes("apple")) return "/brands/apple-tv-plus.svg";
  if (norm.includes("paramount")) return "/brands/paramount-plus.svg";
  if (norm.includes("marvel")) return "/brands/marvel.svg";
  if (norm.includes("a24")) return "/brands/a24.svg";
  if (norm.includes("pixar")) return "/brands/pixar.svg";
  if (norm.includes("ghibli")) return "/brands/studio-ghibli.svg";
  if (norm.includes("dc")) return "/brands/dc.svg";
  if (norm.includes("warner")) return "/brands/warner-bros.svg";
  if (norm.includes("universal")) return "/brands/universal.svg";

  return null;
}

export default function BrandLogo({ id, name, className, style }) {
  const src = getBrandLogoUrl(id || name);
  if (!src) return null;

  return (
    <img
      src={src}
      alt={name || id || "Brand Logo"}
      className={className}
      style={{
        display: "block",
        maxHeight: "100%",
        maxWidth: "100%",
        objectFit: "contain",
        userSelect: "none",
        pointerEvents: "none",
        ...style,
      }}
      loading="eager"
      decoding="async"
    />
  );
}

// Named exports for compatibility
export function NetflixLogo(props) { return <BrandLogo id="netflix" {...props} />; }
export function PrimeVideoLogo(props) { return <BrandLogo id="prime" {...props} />; }
export function DisneyPlusLogo(props) { return <BrandLogo id="disney" {...props} />; }
export function HboMaxLogo(props) { return <BrandLogo id="max" {...props} />; }
export function HuluLogo(props) { return <BrandLogo id="hulu" {...props} />; }
export function AppleTvLogo(props) { return <BrandLogo id="apple" {...props} />; }
export function ParamountPlusLogo(props) { return <BrandLogo id="paramount" {...props} />; }
export function MarvelLogo(props) { return <BrandLogo id="marvel" {...props} />; }
export function A24Logo(props) { return <BrandLogo id="a24" {...props} />; }
export function PixarLogo(props) { return <BrandLogo id="pixar" {...props} />; }
export function StudioGhibliLogo(props) { return <BrandLogo id="ghibli" {...props} />; }
export function DcLogo(props) { return <BrandLogo id="dc" {...props} />; }
export function WarnerBrosLogo(props) { return <BrandLogo id="warner" {...props} />; }
export function UniversalLogo(props) { return <BrandLogo id="universal" {...props} />; }
