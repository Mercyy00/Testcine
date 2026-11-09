# HLS streaming

DIVINE resolves configured CDN mirrors through `GET /api/sources`, then the browser downloads playlists and segments directly from the selected CDN. The Next.js server never proxies video bytes. The watch page supports adaptive quality, manual quality, seek, mute, volume, fullscreen, saved progress, and automatic failover after fatal playback errors. Official trailers remain available separately.

## Configure origins

Add the fields from `.env.example` to your existing `.env.local` and restart Next.js. Leave unused origins empty; they will not appear as servers. Origins accept an optional base path, such as `https://cdn.example.com/library`. Production requires HTTPS and disallows credentials, query parameters, and fragments in the origin.

```dotenv
STREAM_BOREAS_ORIGIN=https://cdn-east.yourdomain.com
STREAM_KRATOS_ORIGIN=https://cdn-eu.yourdomain.com
STREAM_ZEUS_ORIGIN=https://cdn-backup.yourdomain.com
STREAM_DEFAULT_SERVER=boreas
```

Each mirror must expose **the same encoded content and timeline** under the same relative path. Server switching involves loading and buffering the new mirror; it preserves position and playback intent but can briefly interrupt playback.

| Media | Path relative to origin |
| --- | --- |
| Movie | `media/movie/{id}/master.m3u8` |
| Series | `media/series/{id}/season-{season}/episode-{episode}/master.m3u8` |
| Anime | `media/anime/{id}/season-{season}/episode-{episode}/master.m3u8` |

IDs match the watch URL, including any `movie-`, `tv-`, or slug prefix. Series and anime default to season 1, episode 1. Existing `?ep=3` watch links are supported, as are `?season=2&episode=3`. `type=tv` is an API alias for `series`.

The API returns `{ servers: [{ id, name, url, status }], default }`. No configured mirrors produces `{ servers: [], default: null }` and an unavailable state in the UI. `STREAM_BOREAS_STATUS`, `STREAM_KRATOS_STATUS`, and `STREAM_ZEUS_STATUS` accept `online` or `offline`. These are administrative settings, not live health checks. Offline nodes cannot be selected. Client failures mark a node unavailable for that playback attempt; Retry resets the attempts.

Only GET is supported (405 with `Allow: GET` otherwise). Invalid IDs, types, and episodes return 400. Invalid origin configuration returns a generic 500. Responses use `Cache-Control: private, no-store`.

## Encode your source media

Install FFmpeg and FFprobe with H.264 (`libx264`) and AAC support on a worker machine. Run:

```bash
npm run transcode -- input.mp4 output-directory
```

The output directory must be new. The script selects 360p, 720p, and 1080p renditions up to the input's height, preserves aspect ratio, and avoids upscaling. Smaller inputs get a single rendition. It generates 4-second MPEG-TS segments, a VOD master playlist, and separate variant directories. Renditions use matching 30 fps timelines, closed GOPs, and aligned keyframes every 4 seconds. Audio is mapped separately to each variant; inputs without audio are supported. The script rejects an unusable master playlist, which FFmpeg can emit for subsecond inputs.

```text
output-directory/
  master.m3u8
  360p/index.m3u8
  360p/segment_00000.ts
  720p/index.m3u8
  720p/segment_00000.ts
  1080p/index.m3u8
  1080p/segment_00000.ts
```

Encode once in a background job, then replicate the entire output directory to each mirror. Do not transcode separately on each mirror: timestamps and segment boundaries need to match. FFmpeg is not run inside API requests.

## Storage and CDN

Provision R2, S3, or B2 and place a CDN in front of each origin. Upload the output contents to the media path above, keeping relative playlist references intact. Configure each provider with:

- `application/vnd.apple.mpegurl` for `.m3u8` and `video/mp2t` for `.ts`.
- CORS allowing GET and HEAD from your deployed site's origin for **all playlists and segments**. The same-origin Next.js API does not need cross-origin access.
- Cacheable VOD assets under versioned or immutable media IDs. Purge all mirrors together if replacing content at an existing path. Do not cache error responses for long periods.
- Origin shielding and optional geo routing appropriate to your providers.

R2 has no direct egress fee. BunnyCDN charges for delivery; a zero-egress storage service does not make every CDN or replication step free.

Bucket provisioning, replication, provider credentials, and deployment are infrastructure setup steps outside this repository. No providers are contacted until origins are configured.

## Access control

This catalogue currently has no server session or entitlement system. `/api/sources` is a **public resolver**, not an authentication gateway. For public or licensed-to-share assets it can be used as is. Before serving restricted media, add server-side authentication and per-title/episode authorization to this route, then generate short-lived CDN tokens or signed URLs server-side. Protect variant playlists and segments as well as the master playlist; protecting the master alone does not restrict segment access. Keep storage credentials and signing secrets out of `NEXT_PUBLIC_*` variables.

## Verify

FFmpeg and FFprobe must be on PATH for both the encoding test and browser tests.

```bash
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Browser tests require FFmpeg and FFprobe on PATH. They generate synthetic HLS in the OS temporary directory, serve it on a local test CDN, and run an isolated Chromium session against Next.js on port 4173. They exercise real playback, quality, seeking, server switching, persisted progress, unavailable states, and bounded failover. Browsers without Hls.js/MediaSource support can use native HLS, with quality selection managed by the browser. This fallback needs separate testing on Safari/iOS.
