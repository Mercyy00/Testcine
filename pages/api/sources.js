import { resolveSources } from "../../lib/sources.mjs";
import { resolveGreekGodSources } from "../../lib/servers.js";
import { getTitle } from "../../lib/data.server.js";
import { extractAniListId } from "../../lib/anilist.js";
import { fetchImdbId } from "../../lib/tmdb.js";
import { TMDB_IMDB_MAP } from "../../lib/constants.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { id, type = "movie", season, episode, ep, tmdbId, anilistId, imdbId, progress, title, poster, idType, subType, dub } = req.query;

    if (typeof id !== "string" || !/^[a-zA-Z0-9_.-]{1,160}$/.test(id)) {
      return res.status(400).json({ error: "Invalid id parameter" });
    }
    if (!["movie", "series", "anime", "tv"].includes(type)) {
      return res.status(400).json({ error: "Invalid type parameter" });
    }
    if (episode !== undefined && ep !== undefined && episode !== ep) {
      return res.status(400).json({ error: "Conflicting episode parameters" });
    }
    if (type === "movie" && [season, episode, ep].some((v) => v !== undefined)) {
      return res.status(400).json({ error: "Movies do not accept season or episode parameters" });
    }

    // Resolve TMDB, AniList, and IMDb identifiers
    let resolvedTmdbId = tmdbId ? parseInt(tmdbId, 10) : null;
    let resolvedAniListId = anilistId ? parseInt(anilistId, 10) : null;
    let resolvedImdbId = imdbId ? String(imdbId).trim() : null;
    const serverTitle = getTitle(id);

    if (!resolvedTmdbId || !resolvedAniListId || !resolvedImdbId) {
      if (serverTitle) {
        if (!resolvedTmdbId && serverTitle.tmdbId) resolvedTmdbId = serverTitle.tmdbId;
        if (!resolvedAniListId && serverTitle.anilistId) resolvedAniListId = serverTitle.anilistId;
        if (!resolvedImdbId && serverTitle.imdbId) resolvedImdbId = serverTitle.imdbId;
      }
    }
    if (!resolvedAniListId) {
      resolvedAniListId = extractAniListId(id);
    }
    if (!resolvedTmdbId) {
      const numMatch = id.match(/(\d+)$/) || id.match(/(?:movie|tv|series)-(\d+)/i) || id.match(/^(\d+)$/);
      if (numMatch) resolvedTmdbId = parseInt(numMatch[1], 10);
    }

    // Check catalogue IMDb map
    if (!resolvedImdbId) {
      if (resolvedTmdbId && TMDB_IMDB_MAP[String(resolvedTmdbId)]) {
        resolvedImdbId = TMDB_IMDB_MAP[String(resolvedTmdbId)];
      } else if (id && TMDB_IMDB_MAP[String(id).toLowerCase()]) {
        resolvedImdbId = TMDB_IMDB_MAP[String(id).toLowerCase()];
      }
    }

    // Automatic live IMDb ID puller (TMDB external_ids + IMDb suggestion fallback)
    if (!resolvedImdbId) {
      try {
        const queryTitle = title || serverTitle?.title || id.replace(/^(movie|tv|series|anime)-/, "").replace(/-/g, " ");
        const queryYear = serverTitle?.year || null;
        resolvedImdbId = await fetchImdbId(type, resolvedTmdbId, queryTitle, queryYear);
      } catch {
        // dynamic lookup fallback
      }
    }

    // Greek God servers (Poseidon default, Zeus second, etc.)
    const greekSources = resolveGreekGodSources({
      id,
      type,
      tmdbId: resolvedTmdbId,
      anilistId: resolvedAniListId,
      imdbId: resolvedImdbId,
      season: season || 1,
      episode: episode ?? ep ?? 1,
      progress: progress || 0,
      autoplay: true,
      title: title || serverTitle?.title,
      backdrop: serverTitle?.backdrop,
      poster: poster || serverTitle?.poster,
      idType,
      subType,
      dub: dub !== undefined ? dub === "true" || dub === "1" : undefined,
      embedUrl: serverTitle?.embedUrl,
    });

    // Optional legacy HLS mirrors from process.env if configured
    let hlsSources = { servers: [], default: null };
    try {
      hlsSources = resolveSources(req.query);
    } catch {
      // HLS resolution failure shouldn't block primary embed servers
    }

    const allServers = [...greekSources.servers, ...(hlsSources.servers || [])];
    const defaultServer = greekSources.default || hlsSources.default || allServers[0]?.id || null;

    return res.status(200).json({
      servers: allServers,
      default: defaultServer,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: status === 500 ? "Streaming is temporarily unavailable" : error.message,
    });
  }
}
