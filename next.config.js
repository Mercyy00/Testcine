/** @type {import('next').NextConfig} */
module.exports = {
  distDir: process.env.VIVARIUM_TEST_BUILD === "1" ? ".next-test" : ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
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
