import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// eslint-config-next@16 ships native flat-config arrays; spread them directly.
export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-test/**",
      "out/**",
      "lib/tmdb_titles.json",
      "scripts/**",
      "tests/browser/media-server.mjs",
      "lint*.txt",
      "npm-*.log",
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "@next/next/no-img-element": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];
