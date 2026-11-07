/**
 * Configurable Streaming Server Origins for Vivarium
 *
 * Each server (Boreas, Kratos, Zeus, Hermes) maps to an HLS origin or CDN endpoint.
 * You can set custom origins in .env.local:
 *   NEXT_PUBLIC_STREAM_ORIGIN_BOREAS=https://your-boreas-cdn.com
 *   NEXT_PUBLIC_STREAM_ORIGIN_KRATOS=https://your-kratos-cdn.com
 *   NEXT_PUBLIC_STREAM_ORIGIN_ZEUS=https://your-zeus-cdn.com
 *   NEXT_PUBLIC_STREAM_ORIGIN_HERMES=https://your-hermes-cdn.com
 */

export const STREAM_SERVERS = [
  {
    id: "boreas",
    name: "Boreas",
    badge: "1080p Fast",
    originEnv: "NEXT_PUBLIC_STREAM_ORIGIN_BOREAS",
    // Public fallback HLS test stream for immediate verification
    defaultSample: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: "kratos",
    name: "Kratos",
    badge: "Multi-bitrate",
    originEnv: "NEXT_PUBLIC_STREAM_ORIGIN_KRATOS",
    defaultSample: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
  },
  {
    id: "zeus",
    name: "Zeus",
    badge: "Backup Mirror",
    originEnv: "NEXT_PUBLIC_STREAM_ORIGIN_ZEUS",
    defaultSample: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
  },
  {
    id: "hermes",
    name: "Hermes",
    badge: "Low Latency",
    originEnv: "NEXT_PUBLIC_STREAM_ORIGIN_HERMES",
    defaultSample: "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
  },
];

/**
 * Resolves the stream URL for a given title and server.
 * If a custom origin is defined in environment variables, it formats:
 *   {ORIGIN}/hls/{type}/{id}/master.m3u8
 * Otherwise, falls back to the test stream so the player is always testable.
 */
export function getStreamUrl(server, titleId, type = "movie") {
  if (!server) return null;

  // Check if a custom origin is provided via process.env
  const customOrigin =
    typeof process !== "undefined" && process.env
      ? process.env[server.originEnv]
      : null;

  if (customOrigin) {
    const cleanOrigin = customOrigin.replace(/\/$/, "");
    return `${cleanOrigin}/hls/${type}/${titleId}/master.m3u8`;
  }

  // Fallback to sample stream
  return server.defaultSample;
}

/**
 * Returns the list of all available servers with their resolved stream URLs.
 */
export function getAvailableServers(titleId, type = "movie") {
  return STREAM_SERVERS.map((server) => ({
    id: server.id,
    name: server.name,
    badge: server.badge,
    url: getStreamUrl(server, titleId, type),
    isCustom: Boolean(
      typeof process !== "undefined" && process.env && process.env[server.originEnv]
    ),
  }));
}
