/** @type {import('next').NextConfig} */

const csp = [
  "default-src 'self'",
  "img-src 'self' data: https://image.tmdb.org https://img.youtube.com",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "connect-src 'self' https://image.tmdb.org https://api.themoviedb.org https://*.youtube.com https://*.supabase.co wss://*.supabase.co",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "script-src 'self' 'unsafe-inline'",
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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
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
