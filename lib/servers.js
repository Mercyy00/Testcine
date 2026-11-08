/**
 * Greek God Streaming Servers Registry for Vivarium
 *
 * Each server is named after a Greek God.
 * Servers can be embed iframes or direct streams.
 * 1. Zeus (Vidy) - Default server
 * 2. Poseidon (VidRift) - Second server, custom-themed for Vivarium
 * 3. Hades (vidstuck) - Third server
 * 4. Apollo (vidbolt) - Fourth server
 * 5. Hermes (Rivestream) - Fifth server
 * 6. Ares (Cinezo) - Sixth server, custom-themed for Vivarium
 * 7. Atlas (atlantic) - Seventh server
 */

import { extractAniListId } from "./anilist.js";
import { TITLE_TMDB_MAP, ANIME_ANILIST_MAP, ANIME_MOVIES_SET } from "./constants.js";

/**
 * Robustly resolves numeric TMDB ID and AniList ID from ID, slug, or props.
 */
export function resolveMediaIdentifiers({ id, tmdbId, anilistId, type }) {
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
      const stripped = cleanId.replace(/^(movie|tv|series|anime)-/, "");
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

  // 3. Determine if this is an anime movie
  const cleanId = id ? String(id).toLowerCase().trim() : "";
  const isAnimeMovie =
    (type === "movie" && Boolean(numericAniListId)) ||
    (Boolean(cleanId) && ANIME_MOVIES_SET.has(cleanId));

  return {
    numericTmdbId,
    numericAniListId,
    isAnimeMovie,
  };
}

export const GREEK_GOD_SERVERS = [
  {
    id: "zeus",
    name: "Zeus",
    god: "Zeus",
    title: "Zeus (Vidy)",
    provider: "Vidy",
    type: "embed",
    status: "online",
    isDefault: true,
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
    id: "poseidon",
    name: "Poseidon",
    god: "Poseidon",
    title: "Poseidon (VidRift)",
    provider: "VidRift",
    type: "embed",
    status: "online",
    isDefault: false,
    accentColor: "DC2626",
    /**
     * Builds VidRift embed URL tailored to Vivarium's theme:
     * - Movies: /embed/movie/{tmdb_id}
     * - Series / TV: /embed/tv/{tmdb_id}/{season}/{episode}
     * - Anime: /embed/anilist/{anilist_id}/{episode} (or /embed/tv/{tmdb_id}/{season}/{episode})
     * Theme Customizations:
     * - brand=Vivarium
     * - brandColor=dc2626
     * - controlBg=solid
     * - font=Inter
     * - showTitle=1
     * - exit=1
     */
    buildUrl({ type, tmdbId, anilistId, id, season = 1, episode = 1, title, backdrop, poster }) {
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
      // Vivarium branding and styling
      params.set("brand", "Vivarium");
      params.set("brandColor", "dc2626");
      params.set("controlBg", "solid");
      params.set("font", "Inter");
      params.set("showTitle", "1");
      params.set("exit", "1");

      if (title && typeof title === "string") {
        params.set("title", title);
      }

      const posterUrl = backdrop || poster;
      if (posterUrl && typeof posterUrl === "string" && posterUrl.startsWith("https://")) {
        params.set("poster", posterUrl);
      }

      return `https://embed.vidrift.net${path}?${params.toString()}`;
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
      params.set("branding", "Vivarium");
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
];

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
}) {
  const s = Math.max(1, parseInt(season, 10) || 1);
  const ep = Math.max(1, parseInt(episode, 10) || 1);

  const servers = GREEK_GOD_SERVERS.map((server) => {
    const url = server.buildUrl({
      id,
      type,
      tmdbId,
      anilistId,
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

  const preferred = servers.find((server) => server.id === "zeus" && server.status === "online");
  const defaultServerId = preferred?.id || servers.find((s) => s.status === "online")?.id || servers[0]?.id || null;

  return {
    servers,
    default: defaultServerId,
  };
}
