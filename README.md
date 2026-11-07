# Vivarium

A dark, glass-style streaming catalogue UI built from the measured reference tokens. Next.js (Pages Router), React, CSS Modules, Motion and Lucide icons.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## What is here

| Route | What it does |
| --- | --- |
| `/` | Hero carousel, Continue watching, Top 10 Today, Popular (period chip), Trending, Browse by service and studio, Popular on (service chip), Coming soon, Airing |
| `/movies` `/series` `/anime` | Genre chips and sorting |
| `/title/[id]` | Details, My list, copy link, More like this |
| `/watch/[id]` | HLS player with server switching, quality controls and saved progress; official trailers |
| `/api/sources` | Configured CDN mirrors for a movie or episode |
| `/search?q=` | Results page. The header search also has a live palette with history and arrow-key navigation (press `/` to focus) |
| `/discover` | Filter by format, service and studio |
| `/lists` `/history` `/schedule` `/watch-party` `/profiles` `/settings` | The profile menu pages |

On phones the nav becomes a bottom tab bar with an animated active pill.

## Architecture & Data Sources

- **Metadata Engine**: Vivarium uses a committed TMDB (The Movie Database) snapshot in `lib/tmdb_titles.json` as the offline catalogue base, with dynamic real-time lookups via `lib/tmdb.js` and server-side routes in `pages/api/tmdb/*`.
- **Streaming Pipeline**: HLS video playback is powered by `hls.js` and resolved through `pages/api/sources.js`. Configure your own HTTPS CDN mirrors via `STREAM_*_ORIGIN` environment variables as documented in [streaming guide](docs/streaming.md).
- **Client State**: `lib/store.js` manages user watchlist, per-episode watch history, custom lists, reactions, and player settings via structured, versioned `localStorage`.
- **Art & Assets**: Titles use official high-resolution posters and backdrops from TMDB with SVG fallback generation in `components/Art.js`.
- **Attribution**: This product uses the TMDB API but is not endorsed or certified by TMDB.
