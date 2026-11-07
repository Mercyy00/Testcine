const NODES = [
  { id: "boreas", name: "Boreas", key: "BOREAS" },
  { id: "kratos", name: "Kratos", key: "KRATOS" },
  { id: "zeus", name: "Zeus", key: "ZEUS" },
];

function invalid(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function episodeNumber(value, name) {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d{0,3}$/.test(value)) {
    invalid(`Invalid ${name} parameter`);
  }
  return Number(value);
}

/**
 * Query: { id: string, type: movie|series|anime|tv, season?, episode?|ep? }.
 * Result: { servers: Array<{id, name, url, status: online|offline}>, default: string|null }.
 * Origins are trusted server configuration; requests cannot supply a media URL.
 */
export function resolveSources(query, env = process.env) {
  const { id, type, season, episode, ep } = query;
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(id)) invalid("Invalid id parameter");
  if (!["movie", "series", "anime", "tv"].includes(type)) invalid("Invalid type parameter");
  if (episode !== undefined && ep !== undefined && episode !== ep) invalid("Conflicting episode parameters");
  if (type === "movie" && [season, episode, ep].some((value) => value !== undefined)) {
    invalid("Movies do not accept season or episode parameters");
  }
  const mediaType = type === "tv" ? "series" : type;
  let path = `media/${mediaType}/${id}/`;
  if (mediaType !== "movie") {
    path += `season-${episodeNumber(season, "season")}/episode-${episodeNumber(episode ?? ep, "episode")}/`;
  }
  path += "master.m3u8";

  const servers = NODES.flatMap(({ id: nodeId, name, key }) => {
    const origin = env[`STREAM_${key}_ORIGIN`]?.trim();
    if (!origin) return [];
    let url;
    try { url = new URL(origin); } catch { invalid("Invalid streaming configuration", 500); }
    const local = env.NODE_ENV !== "production" && url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !local) || url.username || url.password || url.search || url.hash) {
      invalid("Invalid streaming configuration", 500);
    }
    const status = env[`STREAM_${key}_STATUS`] || "online";
    if (!["online", "offline"].includes(status)) invalid("Invalid streaming configuration", 500);
    return [{ id: nodeId, name, status, url: `${url.href.replace(/\/+$/, "")}/${path}` }];
  });
  const preferred = servers.find((server) => server.id === env.STREAM_DEFAULT_SERVER && server.status === "online");
  return { servers, default: preferred?.id || servers.find((server) => server.status === "online")?.id || null };
}
