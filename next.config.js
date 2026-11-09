/** @type {import('next').NextConfig} */

const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://image.tmdb.org https://img.youtube.com https://s4.anilist.co https:",
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://*.vidrift.net https://embed.vidrift.net https://*.vidy.st https://vidy.st https://*.vidqueen.st https://vidqueen.st https://*.vidstuck.cc https://vidstuck.cc https://*.vidbolt.co https://vidbolt.co https://*.rivestream.app https://www.rivestream.app https://*.cinezo.live https://player.cinezo.live https://*.atlantic.st https://atlantic.st https:",
  "connect-src 'self' https://image.tmdb.org https://api.themoviedb.org https://graphql.anilist.co https://*.youtube.com https://*.supabase.co wss://*.supabase.co https: http:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

module.exports = {
  distDir: process.env.VIVARIUM_TEST_BUILD === "1" ? ".next-test" : ".next",
  output: process.env.STANDALONE === "1" ? "standalone" : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/my-list",
        destination: "/watchlist",
        permanent: true,
      },
      {
        source: "/downloads",
        destination: "/settings?tab=downloads",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/browse/movie",
        destination: "/movies",
      },
      {
        source: "/browse/tv",
        destination: "/series",
      },
    ];
  },
};
