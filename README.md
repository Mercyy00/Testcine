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

## Make it yours

- `lib/data.js` holds the placeholder catalogue, services, studios and brand name. Replace it with your API or CMS. Titles are fictional on purpose.
- `components/Art.js` draws generated posters and backdrops. Swap it for real images in `MediaCard` and `HeroBanner`.
- `styles/globals.css` holds the design tokens (`--bg`, `--surface-*`, `--glow-shadow`, motion keyframes) copied from the reference measurements.
- `lib/store.js` keeps lists, history, searches and settings in `localStorage`.
- Font: the reference uses "NS Sans", which is not on Google Fonts. Figtree is the fallback. Add your licensed font via `@font-face` and it takes priority.
- Configure video origins and encode media using the [streaming setup guide](docs/streaming.md). The watch party still needs a realtime backend.
