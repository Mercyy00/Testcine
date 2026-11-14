/**
 * Greek God Streaming Servers Registry for DIVINE
 *
 * Each server is named after a Greek God.
 * Servers can be embed iframes or direct streams.
 * 1. Poseidon (VidRift) - Default server, custom-themed for DIVINE
 * 2. Zeus (Vidy) - Second server
 * 3. Hera (VidQueen) - Third server
 * 4. Hades (vidstuck) - Fourth server
 * 5. Apollo (vidbolt) - Fifth server
 * 6. Hermes (Rivestream) - Sixth server
 * 7. Ares (Cinezo) - Seventh server, custom-themed for DIVINE
 * 8. Atlas (atlantic) - Eighth server
 * 9. Dionysus (Play4U) - Ninth server (IMDb-based streams)
 */

import { extractAniListId } from "./anilist.js";
import { TITLE_TMDB_MAP, ANIME_ANILIST_MAP, ANIME_MOVIES_SET, ANILIST_TMDB_MAP, TMDB_IMDB_MAP } from "./constants.js";

/**
 * Robustly resolves numeric TMDB ID, AniList ID, and IMDb ID from ID, slug, or props.
 */
export function resolveMediaIdentifiers({ id, tmdbId, anilistId, imdbId, type }) {
  // 1. Resolve numeric TMDB ID
  let numericTmdbId = null;
  if (tmdbId && /^\d+$/.test(String(tmdbId))) {
    numericTmdbId = parseInt(tmdbId, 10);
  } else if (id) {
    const cleanId = String(id).toLowerCase().trim();
    if (/^\d+$/.test(cleanId) && type !== "anime") {
      numericTmdbId = parseInt(cleanId, 10);
    } else if (TITLE_TMDB_MAP[cleanId]) {
      numericTmdbId = TITLE_TMDB_MAP[cleanId];
    } else {
      const stripped = cleanId.replace(/^(movie|tv|series|anime|anilist)-/, "");
      if (/^\d+$/.test(stripped) && type !== "anime") {
        numericTmdbId = parseInt(stripped, 10);
      } else if (TITLE_TMDB_MAP[stripped]) {
        numericTmdbId = TITLE_TMDB_MAP[stripped];
      }
    }
  }

  // 2. Resolve numeric AniList ID
  let numericAniListId = null;
  if (anilistId && /^\d+$/.test(String(anilistId))) {
    numericAniListId = parseInt(anilistId, 10);
  } else if (id) {
    const cleanId = String(id).toLowerCase().trim();
    const extracted = extractAniListId(cleanId);
    if (extracted) {
      numericAniListId = extracted;
    } else if (ANIME_ANILIST_MAP[cleanId]) {
      numericAniListId = ANIME_ANILIST_MAP[cleanId];
    } else {
      const stripped = cleanId.replace(/^(anime|anilist)-/, "");
      if (ANIME_ANILIST_MAP[stripped]) {
        numericAniListId = ANIME_ANILIST_MAP[stripped];
      }
    }
  }

  // 3. Fallback TMDB resolution from mapped AniList ID
  if (!numericTmdbId && numericAniListId && ANILIST_TMDB_MAP[numericAniListId]) {
    numericTmdbId = ANILIST_TMDB_MAP[numericAniListId];
  }

  // 4. Resolve IMDb ID (e.g. tt4154796, tt23112594)
  let resolvedImdbId = null;
  if (imdbId && /^tt\d+$/i.test(String(imdbId).trim())) {
    resolvedImdbId = String(imdbId).trim().toLowerCase();
  } else if (id) {
    const cleanId = String(id).toLowerCase().trim();
    if (/^tt\d+$/i.test(cleanId)) {
      resolvedImdbId = cleanId;
    } else {
      const match = cleanId.match(/tt\d+/i);
      if (match) {
        resolvedImdbId = match[0].toLowerCase();
      }
    }
  }

  if (!resolvedImdbId) {
    if (numericTmdbId && TMDB_IMDB_MAP[String(numericTmdbId)]) {
      resolvedImdbId = TMDB_IMDB_MAP[String(numericTmdbId)];
    } else if (id && TMDB_IMDB_MAP[String(id).toLowerCase()]) {
      resolvedImdbId = TMDB_IMDB_MAP[String(id).toLowerCase()];
    }
  }

  // 5. Determine if this is an anime movie
  const cleanId = id ? String(id).toLowerCase().trim() : "";
  const isAnimeMovie =
    (type === "movie" && Boolean(numericAniListId)) ||
    (Boolean(cleanId) && ANIME_MOVIES_SET.has(cleanId));

  return {
    numericTmdbId,
    numericAniListId,
    resolvedImdbId,
    isAnimeMovie,
  };
}

export const GREEK_GOD_SERVERS = [
  {
    id: "poseidon",
    name: "Poseidon",
    god: "Poseidon",
    title: "Poseidon (VidRift)",
    provider: "VidRift",
    type: "embed",
    status: "online",
    isDefault: true,
    accentColor: "DC2626",
    /**
     * Builds VidRift embed URL tailored to DIVINE:
     * - Movies: /embed/movie/{tmdb_id}
     * - Series / TV: /embed/tv/{tmdb_id}/{season}/{episode}
     * - Anime: /embed/anilist/{anilist_id}/{episode} (or /embed/tv/{tmdb_id}/{season}/{episode})
     * Parameters:
     * - title={title}
     * - brand=Divine
     * - showTitle=1
     * - exit=1
     */
    buildUrl({ type, tmdbId, anilistId, id, season = 1, episode = 1, title }) {
      const s = Math.max(1, parseInt(season, 10) || 1);
      const ep = Math.max(1, parseInt(episode, 10) || 1);

      const { numericTmdbId, numericAniListId, isAnimeMovie } = resolveMediaIdentifiers({
        id,
        tmdbId,
        anilistId,
        type,
      });

      let path = "";
      if (isAnimeMovie) {
        if (!numericTmdbId) return null;
        path = `/embed/movie/${numericTmdbId}`;
      } else if (numericAniListId && (type === "anime" || !numericTmdbId)) {
        path = `/embed/anilist/${numericAniListId}/${ep}`;
      } else if (type === "movie") {
        if (!numericTmdbId) return null;
        path = `/embed/movie/${numericTmdbId}`;
      } else {
        if (!numericTmdbId) return null;
        path = `/embed/tv/${numericTmdbId}/${s}/${ep}`;
      }

      const params = new URLSearchParams();

      if (title && typeof title === "string" && title.trim()) {
        params.set("title", title.trim());
      }

      params.set("brand", "Divine");
      params.set("showTitle", "1");
      params.set("exit", "1");

      const queryString = params.toString().replace(/\+/g, "%20");
      return `https://embed.vidrift.net${path}?${queryString}`;
    },
  },
  {
    id: "zeus",
    name: "Zeus",
    god: "Zeus",
    title: "Zeus (Vidy)",
    provider: "Vidy",
    type: "embed",
    status: "online",
    isDefault: false,
    accentColor: "DC2626",
    /**
     * Builds Vidy embed URL based on media type and parameters:
     * - Movies: /movie/{tmdbId}
     * - Series: /tv/{tmdbId}/{season}/{episode}
     * - Anime:  /anime/{anilistId}/{episode}
     */
    buildUrl({ type, tmdbId, anilistId, id, season = 1, episode = 1, progress = 0, autoplay = true }) {
      const s = Math.max(1, parseInt(season, 10) || 1);
      const ep = Math.max(1, parseInt(episode, 10) || 1);

      const { numericTmdbId, numericAniListId, isAnimeMovie } = resolveMediaIdentifiers({
        id,
        tmdbId,
        anilistId,
        type,
      });

      let path = "";
      if (isAnimeMovie) {
        if (!numericTmdbId) return null;
        path = `/movie/${numericTmdbId}`;
      } else if (numericAniListId && (type === "anime" || !numericTmdbId)) {
        // Anime series uses AniList id plus episode
        path = `/anime/${numericAniListId}/${ep}`;
      } else if (type === "movie") {
        if (!numericTmdbId) return null;
        path = `/movie/${numericTmdbId}`;
      } else {
        // Series / TV show (always requires season and episode)
        if (!numericTmdbId) return null;
        path = `/tv/${numericTmdbId}/${s}/${ep}`;
      }

      const params = new URLSearchParams();
      // Accent color: 6-digit hex without #
      params.set("color", "DC2626");

      // Autoplay: starts with sound when browser allows
      if (autoplay) {
        params.set("autoplay", "true");
      }

      // Resume watch position in integer seconds if stored
      const progSec = Math.floor(Number(progress) || 0);
      if (progSec > 10) {
        params.set("progress", String(progSec));
      }

      // Series / Anime controls
      if (type !== "movie" && !isAnimeMovie) {
        params.set("nextEpisode", "true");
        params.set("episodeSelector", "true");
        params.set("autoplayNextEpisode", "true");
      }

      return `https://vidy.st${path}?${params.toString()}`;
    },
  },
  {
    id: "hera",
    name: "Hera",
    god: "Hera",
    title: "Hera (VidQueen)",
    provider: "VidQueen",
    type: "embed",
    status: "online",
    isDefault: false,
    accentColor: "dc2626",
    /**
     * Builds VidQueen embed URL based on media type and parameters:
     * - Movies: /embed/movie/{tmdbId}
     * - Series / TV: /embed/tv/{tmdbId}/{season}/{episode}
     * Supports parameters:
     * - q=2160 (4K playback)
     * - primarycolor=dc2626 (DIVINE red accent)
     * - secondarycolor=0a0708 (dark background)
     * - iconcolor=ffffff (control icons)
     * - autoplay=true
     * - autonext=true, showNextEpisode=true for TV
     */
    buildUrl({
      type,
      tmdbId,
      anilistId,
      id,
      season = 1,
      episode = 1,
      progress = 0,
      autoplay = true,
      q = "2160",
      primarycolor = "dc2626",
      secondarycolor = "0a0708",
      iconcolor = "ffffff",
      hidetitle,
    }) {
      const s = Math.max(1, parseInt(season, 10) || 1);
      const ep = Math.max(1, parseInt(episode, 10) || 1);

      const { numericTmdbId, isAnimeMovie } = resolveMediaIdentifiers({
        id,
        tmdbId,
        anilistId,
        type,
      });

      if (!numericTmdbId) return null;

      let path = "";
      if (type === "movie" || isAnimeMovie) {
        path = `/embed/movie/${numericTmdbId}`;
      } else {
        path = `/embed/tv/${numericTmdbId}/${s}/${ep}`;
      }

      const params = new URLSearchParams();
      if (q) {
        params.set("q", String(q));
      }
      if (primarycolor) {
        params.set("primarycolor", String(primarycolor).replace(/^#/, ""));
      }
      if (secondarycolor) {
        params.set("secondarycolor", String(secondarycolor).replace(/^#/, ""));
      }
      if (iconcolor) {
        params.set("iconcolor", String(iconcolor).replace(/^#/, ""));
      }
      if (autoplay) {
        params.set("autoplay", "true");
      }
      if (hidetitle) {
        params.set("hidetitle", "true");
      }
      if (type !== "movie" && !isAnimeMovie) {
        params.set("autonext", "true");
        params.set("showNextEpisode", "true");
      }

      const queryString = params.toString();
      return `https://vidqueen.st${path}${queryString ? `?${queryString}` : ""}`;
    },
  },
  {
    id: "hades",
    name: "Hades",
    god: "Hades",
    title: "Hades (vidstuck)",
    provider: "vidstuck",
    type: "embed",
    status: "online",
    isDefault: false,
    accentColor: "DC2626",
    /**
     * Builds vidstuck embed URL based on media type and parameters:
     * - Movies: /embed/movie/{tmdb_id}
     * - Series / TV: /embed/tv/{show_id}/{season}/{episode}
     */
    buildUrl({ type, tmdbId, id, season = 1, episode = 1, progress = 0 }) {
      const s = Math.max(1, parseInt(season, 10) || 1);
      const ep = Math.max(1, parseInt(episode, 10) || 1);

      const { numericTmdbId, isAnimeMovie } = resolveMediaIdentifiers({ id, tmdbId, type });
      if (!numericTmdbId) return null;

      let path = "";
      if (type === "movie" || isAnimeMovie) {
        path = `/embed/movie/${numericTmdbId}`;
      } else {
        path = `/embed/tv/${numericTmdbId}/${s}/${ep}`;
      }

      const params = new URLSearchParams();
      params.set("color", "DC2626");
      params.set("branding", "DIVINE");
      params.set("subtitle", "english");
      params.set("overlay", "true");

      const progSec = Math.floor(Number(progress) || 0);
      if (progSec > 10) {
        params.set("progress", String(progSec));
      }

      if (type !== "movie" && !isAnimeMovie) {
        params.set("nextEpisode", "true");
        params.set("episodeSelector", "true");
        params.set("autoplayNextEpisode", "true");
      }

      return `https://vidstuck.cc${path}?${params.toString()}`;
    },
  },
  {
    id: "apollo",
    name: "Apollo",
    god: "Apollo",
    title: "Apollo (vidbolt)",
    provider: "vidbolt",
    type: "embed",
    status: "online",
    isDefault: false,
    accentColor: "dc2626",
    /**
     * Builds vidbolt embed URL based on media type and parameters:
     * - Movies: /movie/{tmdb_id}
     * - TV: /tv/{tmdb_id}/{season}/{episode}
     * - Anime: /anime/{anilist_id}/{episode} (or /anime/{mal_id}/{episode}?idType=mal)
     */
    buildUrl({ type, tmdbId, anilistId, id, season = 1, episode = 1, progress = 0, autoplay = true, idType }) {
      const s = Math.max(1, parseInt(season, 10) || 1);
      const ep = Math.max(1, parseInt(episode, 10) || 1);

      const { numericTmdbId, numericAniListId, isAnimeMovie } = resolveMediaIdentifiers({
        id,
        tmdbId,
        anilistId,
        type,
      });

      let path = "";
      if (isAnimeMovie) {
        if (!numericTmdbId) return null;
        path = `/movie/${numericTmdbId}`;
      } else if (numericAniListId && (type === "anime" || !numericTmdbId)) {
        path = `/anime/${numericAniListId}/${ep}`;
      } else if (type === "movie") {
        if (!numericTmdbId) return null;
        path = `/movie/${numericTmdbId}`;
      } else {
        if (!numericTmdbId) return null;
        path = `/tv/${numericTmdbId}/${s}/${ep}`;
      }

      const params = new URLSearchParams();
      // Theme accent color: hex without #
      params.set("theme", "dc2626");

      if (autoplay) {
        params.set("autoPlay", "true");
      }

      const progSec = Math.floor(Number(progress) || 0);
      if (progSec > 10) {
        params.set("startAt", String(progSec));
      }

      // Enable mobile bottom sheets delegation
      params.set("mobileSheets", "true");

      if (idType === "mal") {
        params.set("idType", "mal");
      }

      return `https://vidbolt.xyz${path}?${params.toString()}`;
    },
  },
  {
    id: "hermes",
    name: "Hermes",
    god: "Hermes",
    title: "Hermes (Rivestream)",
    provider: "Rivestream",
    type: "embed",
    status: "online",
    isDefault: false,
    accentColor: "dc2626",
    /**
     * Builds Rivestream embed URL based on media type and parameters:
     * - Movies: /embed?type=movie&id={tmdbId}
     * - TV: /embed?type=tv&id={tmdbId}&season={season}&episode={episode}
     * Optional subType: 'agg' (/embed/agg) or 'torrent' (/embed/torrent)
     */
    buildUrl({ type, tmdbId, id, season = 1, episode = 1, subType }) {
      const s = Math.max(1, parseInt(season, 10) || 1);
      const ep = Math.max(1, parseInt(episode, 10) || 1);

      const { numericTmdbId, isAnimeMovie } = resolveMediaIdentifiers({ id, tmdbId, type });
      if (!numericTmdbId) return null;

      const path = subType === "agg" ? "/embed/agg" : subType === "torrent" ? "/embed/torrent" : "/embed";
      const params = new URLSearchParams();

      if (type === "movie" || isAnimeMovie) {
        params.set("type", "movie");
        params.set("id", String(numericTmdbId));
      } else {
        params.set("type", "tv");
        params.set("id", String(numericTmdbId));
        params.set("season", String(s));
        params.set("episode", String(ep));
      }

      return `https://www.rivestream.app${path}?${params.toString()}`;
    },
  },
  {
    id: "ares",
    name: "Ares",
    god: "Ares",
    title: "Ares (Cinezo)",
    provider: "Cinezo",
    type: "embed",
    status: "online",
    isDefault: false,
    accentColor: "dc2626",
    /**
     * Builds Cinezo embed URL based on media type and parameters:
     * - Movies: /embed/movie/{tmdbId}
     * - TV: /embed/tv/{tmdbId}/{season}/{episode}
     * - Anime: /embed/anime/{AniListId}/{episode}?dub=true
     */
    buildUrl({ type, tmdbId, anilistId, id, season = 1, episode = 1, autoplay = true, dub }) {
      const s = Math.max(1, parseInt(season, 10) || 1);
      const ep = Math.max(1, parseInt(episode, 10) || 1);

      const { numericTmdbId, numericAniListId, isAnimeMovie } = resolveMediaIdentifiers({
        id,
        tmdbId,
        anilistId,
        type,
      });

      let path = "";
      if (isAnimeMovie) {
        if (!numericTmdbId) return null;
        path = `/embed/movie/${numericTmdbId}`;
      } else if (numericAniListId && (type === "anime" || !numericTmdbId)) {
        path = `/embed/anime/${numericAniListId}/${ep}`;
      } else if (type === "movie") {
        if (!numericTmdbId) return null;
        path = `/embed/movie/${numericTmdbId}`;
      } else {
        if (!numericTmdbId) return null;
        path = `/embed/tv/${numericTmdbId}/${s}/${ep}`;
      }

      const params = new URLSearchParams();
      params.set("primarycolor", "dc2626");
      params.set("secondarycolor", "ef4444");
      params.set("iconcolor", "ffffff");
      params.set("font", "Inter");
      params.set("fontcolor", "ffffff");

      if (autoplay) {
        params.set("autoplay", "true");
      }

      params.set("poster", "true");
      params.set("pip", "true");
      params.set("chromecast", "true");
      params.set("setting", "true");

      if ((type === "anime" || numericAniListId) && dub !== undefined) {
        params.set("dub", dub ? "true" : "false");
      }

      return `https://player.cinezo.live${path}?${params.toString()}`;
    },
  },
  {
    id: "atlas",
    name: "Atlas",
    god: "Atlas",
    title: "Atlas (atlantic)",
    provider: "Atlantic",
    type: "embed",
    status: "online",
    isDefault: false,
    accentColor: "dc2626",
    /**
     * Builds Atlantic embed URL based on media type and parameters:
     * - Movies: /embed/movie/{tmdbId}
     * - TV: /embed/tv/{tmdbId}/{season}/{episode}
     */
    buildUrl({ type, tmdbId, id, season = 1, episode = 1, progress = 0, autoplay = true }) {
      const s = Math.max(1, parseInt(season, 10) || 1);
      const ep = Math.max(1, parseInt(episode, 10) || 1);

      const { numericTmdbId, isAnimeMovie } = resolveMediaIdentifiers({ id, tmdbId, type });
      if (!numericTmdbId) return null;

      let path = "";
      if (type === "movie" || isAnimeMovie) {
        path = `/embed/movie/${numericTmdbId}`;
      } else {
        path = `/embed/tv/${numericTmdbId}/${s}/${ep}`;
      }

      const params = new URLSearchParams();
      if (autoplay) {
        params.set("autoplay", "true");
      }
      const progSec = Math.floor(Number(progress) || 0);
      if (progSec > 10) {
        params.set("progress", String(progSec));
      }

      const queryString = params.toString();
      return `https://atlantic.st${path}${queryString ? `?${queryString}` : ""}`;
    },
  },
  {
    id: "dionysus",
    name: "Dionysus",
    god: "Dionysus",
    title: "Dionysus (Play4U)",
    provider: "Play4U",
    type: "embed",
    status: "online",
    isDefault: false,
    accentColor: "dc2626",
    /**
     * Builds Play4U embed URL based on media type and parameters:
     * - Movies: /watch/{imdbId}?embed=1
     * - Series / TV: /series/{imdbId}/s-{season}/ep-{episode}?embed=1
     * The embed=1 parameter enables Play4U's pure player mode, hiding all website chrome.
     */
    buildUrl({ type, tmdbId, anilistId, id, imdbId, season = 1, episode = 1, autoplay = true, progress = 0 }) {
      const s = String(Math.max(1, parseInt(season, 10) || 1)).padStart(2, "0");
      const ep = String(Math.max(1, parseInt(episode, 10) || 1)).padStart(2, "0");

      const { resolvedImdbId, isAnimeMovie } = resolveMediaIdentifiers({
        id,
        tmdbId,
        anilistId,
        imdbId,
        type,
      });

      if (!resolvedImdbId) return null;

      const params = new URLSearchParams();
      params.set("embed", "1");
      if (autoplay) params.set("autoplay", "1");
      if (progress > 10) params.set("t", String(Math.floor(progress)));
      const qs = `?${params.toString()}`;

      if (type === "movie" || isAnimeMovie) {
        return `https://play4u.org/watch/${resolvedImdbId}${qs}`;
      }
      return `https://play4u.org/series/${resolvedImdbId}/s-${s}/ep-${ep}${qs}`;
    },
  },
];

/**
 * Title-specific verified custom stream servers (e.g. PlayDrive VIP embed for Ramayana: Rise of a Legend)
 */
export const TITLE_CUSTOM_SERVERS = {
  "ramayana-rise-of-a-legend": [
    {
      id: "playdrive",
      name: "PlayDrive (HD)",
      god: "Helios",
      title: "PlayDrive (HD)",
      provider: "PlayDrive VIP",
      type: "embed",
      status: "online",
      url: "https://playdrive.vip/e/AQGrE48AAgDqcw?stream=hd",
      isDefault: true,
    },
  ],
  "656908": [
    {
      id: "playdrive",
      name: "PlayDrive (HD)",
      god: "Helios",
      title: "PlayDrive (HD)",
      provider: "PlayDrive VIP",
      type: "embed",
      status: "online",
      url: "https://playdrive.vip/e/AQGrE48AAgDqcw?stream=hd",
      isDefault: true,
    },
  ],
};

export function getGreekGodServers() {
  return GREEK_GOD_SERVERS;
}

export function getDefaultGreekGodServer() {
  return GREEK_GOD_SERVERS.find((s) => s.isDefault && s.status === "online") || GREEK_GOD_SERVERS[0];
}

/**
 * Resolves all active Greek God streaming servers for a given media title.
 */
export function resolveGreekGodSources({
  id,
  type = "movie",
  tmdbId,
  anilistId,
  imdbId,
  season = 1,
  episode = 1,
  progress = 0,
  autoplay = true,
  title,
  backdrop,
  poster,
  idType,
  subType,
  dub,
  embedUrl,
}) {
  const s = Math.max(1, parseInt(season, 10) || 1);
  const ep = Math.max(1, parseInt(episode, 10) || 1);

  const cleanId = id ? String(id).toLowerCase().trim() : "";
  const strippedId = cleanId.replace(/^(movie|tv|series|anime)-/, "");
  const tmdbKey = tmdbId ? String(tmdbId) : "";

  // 1. Resolve custom title-specific stream sources (e.g. PlayDrive for Ramayana)
  const customList =
    TITLE_CUSTOM_SERVERS[cleanId] ||
    TITLE_CUSTOM_SERVERS[strippedId] ||
    (tmdbKey ? TITLE_CUSTOM_SERVERS[tmdbKey] : null) ||
    [];

  const customServers = customList.map((srv) => ({ ...srv }));

  if (embedUrl && !customServers.some((s) => s.url === embedUrl)) {
    customServers.unshift({
      id: "playdrive",
      name: "PlayDrive (HD)",
      god: "Helios",
      title: "PlayDrive (HD)",
      provider: "PlayDrive VIP",
      type: "embed",
      status: "online",
      url: embedUrl,
      isDefault: true,
    });
  }

  // 2. Standard Greek God servers
  const standardServers = GREEK_GOD_SERVERS.map((server) => {
    const url = server.buildUrl({
      id,
      type,
      tmdbId,
      anilistId,
      imdbId,
      season: s,
      episode: ep,
      progress,
      autoplay,
      title,
      backdrop,
      poster,
      idType,
      subType,
      dub,
    });

    return {
      id: server.id,
      name: server.name,
      god: server.god,
      provider: server.provider,
      type: server.type,
      status: server.status,
      url,
    };
  }).filter((server) => Boolean(server.url));

  const allServers = [...customServers, ...standardServers];

  const defaultCustom = customServers.find((s) => s.isDefault && s.status === "online");
  const defaultMeta = GREEK_GOD_SERVERS.find((s) => s.isDefault && s.status === "online");
  const preferred = allServers.find((server) => server.id === (defaultMeta?.id || "poseidon") && server.status === "online");
  const defaultServerId =
    defaultCustom?.id ||
    preferred?.id ||
    allServers.find((s) => s.status === "online")?.id ||
    allServers[0]?.id ||
    null;

  return {
    servers: allServers,
    default: defaultServerId,
  };
}
