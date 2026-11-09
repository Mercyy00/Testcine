import test from "node:test";
import assert from "node:assert/strict";
import {
  GREEK_GOD_SERVERS,
  getGreekGodServers,
  getDefaultGreekGodServer,
  resolveGreekGodSources,
} from "../lib/servers.js";

test("Poseidon, Zeus, Hera, Hades, Apollo, Hermes, Ares, and Atlas are registered as Greek god servers with Poseidon as default and Hera below Zeus", () => {
  const servers = getGreekGodServers();
  assert.ok(servers.length >= 8, "Should have at least 8 servers (Poseidon, Zeus, Hera, Hades, Apollo, Hermes, Ares, Atlas)");
  assert.equal(servers[0].id, "poseidon");
  assert.equal(servers[1].id, "zeus");
  assert.equal(servers[2].id, "hera", "Hera must be positioned immediately below Zeus");

  const zeus = servers.find((s) => s.id === "zeus");
  assert.ok(zeus);
  assert.equal(zeus.name, "Zeus");
  assert.equal(zeus.provider, "Vidy");
  assert.equal(zeus.type, "embed");
  assert.equal(zeus.status, "online");
  assert.equal(zeus.isDefault, false);

  const hera = servers.find((s) => s.id === "hera");
  assert.ok(hera);
  assert.equal(hera.name, "Hera");
  assert.equal(hera.provider, "VidQueen");
  assert.equal(hera.type, "embed");
  assert.equal(hera.status, "online");
  assert.equal(hera.isDefault, false);

  const poseidon = servers.find((s) => s.id === "poseidon");
  assert.ok(poseidon);
  assert.equal(poseidon.name, "Poseidon");
  assert.equal(poseidon.provider, "VidRift");
  assert.equal(poseidon.type, "embed");
  assert.equal(poseidon.status, "online");
  assert.equal(poseidon.isDefault, true);

  const hades = servers.find((s) => s.id === "hades");
  assert.ok(hades);
  assert.equal(hades.name, "Hades");
  assert.equal(hades.provider, "vidstuck");
  assert.equal(hades.type, "embed");
  assert.equal(hades.status, "online");

  const apollo = servers.find((s) => s.id === "apollo");
  assert.ok(apollo);
  assert.equal(apollo.name, "Apollo");
  assert.equal(apollo.provider, "vidbolt");
  assert.equal(apollo.type, "embed");
  assert.equal(apollo.status, "online");

  const hermes = servers.find((s) => s.id === "hermes");
  assert.ok(hermes);
  assert.equal(hermes.name, "Hermes");
  assert.equal(hermes.provider, "Rivestream");
  assert.equal(hermes.type, "embed");
  assert.equal(hermes.status, "online");

  const ares = servers.find((s) => s.id === "ares");
  assert.ok(ares);
  assert.equal(ares.name, "Ares");
  assert.equal(ares.provider, "Cinezo");
  assert.equal(ares.type, "embed");
  assert.equal(ares.status, "online");

  const atlas = servers.find((s) => s.id === "atlas");
  assert.ok(atlas);
  assert.equal(atlas.name, "Atlas");
  assert.equal(atlas.provider, "Atlantic");
  assert.equal(atlas.type, "embed");
  assert.equal(atlas.status, "online");

  const defaultServer = getDefaultGreekGodServer();
  assert.equal(defaultServer.id, "poseidon");
});

test("Zeus generates correct Vidy movie embed route and query flags", () => {
  const result = resolveGreekGodSources({
    id: "movie-315162",
    type: "movie",
    tmdbId: 315162,
    progress: 90,
  });

  assert.equal(result.default, "poseidon");
  const zeus = result.servers.find((s) => s.id === "zeus");
  assert.ok(zeus);
  assert.equal(zeus.type, "embed");
  assert.ok(zeus.url.startsWith("https://vidy.st/movie/315162?"));
  assert.match(zeus.url, /color=DC2626/);
  assert.match(zeus.url, /autoplay=true/);
  assert.match(zeus.url, /progress=90/);
});

test("Zeus generates correct Vidy TV route with episode/season controls", () => {
  const result = resolveGreekGodSources({
    id: "tv-1396",
    type: "series",
    tmdbId: 1396,
    season: 2,
    episode: 4,
  });

  const zeus = result.servers.find((s) => s.id === "zeus");
  assert.ok(zeus.url.startsWith("https://vidy.st/tv/1396/2/4?"));
  assert.match(zeus.url, /nextEpisode=true/);
  assert.match(zeus.url, /episodeSelector=true/);
  assert.match(zeus.url, /autoplayNextEpisode=true/);
});

test("Zeus generates correct Vidy Anime route using AniList id", () => {
  const result = resolveGreekGodSources({
    id: "anilist-21",
    type: "anime",
    anilistId: 21,
    episode: 3,
  });

  const zeus = result.servers.find((s) => s.id === "zeus");
  assert.ok(zeus.url.startsWith("https://vidy.st/anime/21/3?"));
  assert.match(zeus.url, /color=DC2626/);
  assert.match(zeus.url, /nextEpisode=true/);
  assert.match(zeus.url, /episodeSelector=true/);
  assert.match(zeus.url, /autoplayNextEpisode=true/);
});

test("Hera (VidQueen) generates correct movie embed route with 4K and DIVINE theme colors", () => {
  const result = resolveGreekGodSources({
    id: "movie-315162",
    type: "movie",
    tmdbId: 315162,
  });

  const hera = result.servers.find((s) => s.id === "hera");
  assert.ok(hera);
  assert.equal(hera.name, "Hera");
  assert.equal(hera.provider, "VidQueen");
  assert.equal(hera.type, "embed");
  assert.ok(hera.url.startsWith("https://vidqueen.st/embed/movie/315162?"));
  assert.match(hera.url, /q=2160/);
  assert.match(hera.url, /primarycolor=dc2626/);
  assert.match(hera.url, /secondarycolor=0a0708/);
  assert.match(hera.url, /iconcolor=ffffff/);
  assert.match(hera.url, /autoplay=true/);

  // Verify Hera is positioned immediately after Zeus in servers list
  const zeusIndex = result.servers.findIndex((s) => s.id === "zeus");
  const heraIndex = result.servers.findIndex((s) => s.id === "hera");
  assert.equal(heraIndex, zeusIndex + 1, "Hera should be immediately below Zeus");
});

test("Hera (VidQueen) generates correct TV route with autonext and showNextEpisode", () => {
  const result = resolveGreekGodSources({
    id: "tv-1396",
    type: "series",
    tmdbId: 1396,
    season: 3,
    episode: 5,
  });

  const hera = result.servers.find((s) => s.id === "hera");
  assert.ok(hera);
  assert.ok(hera.url.startsWith("https://vidqueen.st/embed/tv/1396/3/5?"));
  assert.match(hera.url, /q=2160/);
  assert.match(hera.url, /autonext=true/);
  assert.match(hera.url, /showNextEpisode=true/);
});

test("Poseidon (VidRift) generates movie embed route customized to DIVINE theme", () => {
  const result = resolveGreekGodSources({
    id: "movie-1440098",
    type: "movie",
    tmdbId: 1440098,
    title: "Drawn Together",
    poster: "https://image.tmdb.org/t/p/w500/test.jpg",
  });

  const poseidon = result.servers.find((s) => s.id === "poseidon");
  assert.ok(poseidon);
  assert.equal(poseidon.name, "Poseidon");
  assert.equal(poseidon.provider, "VidRift");
  assert.ok(poseidon.url.startsWith("https://embed.vidrift.net/embed/movie/1440098?"));
  assert.match(poseidon.url, /brand=DIVINE/);
  assert.match(poseidon.url, /brandColor=dc2626/);
  assert.match(poseidon.url, /controlBg=solid/);
  assert.match(poseidon.url, /font=Inter/);
  assert.match(poseidon.url, /showTitle=1/);
  assert.match(poseidon.url, /exit=1/);
  assert.match(poseidon.url, /title=Drawn\+Together/);
  assert.match(poseidon.url, /poster=https%3A%2F%2Fimage\.tmdb\.org%2Ft%2Fp%2Fw500%2Ftest\.jpg/);
});

test("Poseidon (VidRift) generates TV and Anime embed routes", () => {
  const tvResult = resolveGreekGodSources({
    id: "tv-1399",
    type: "series",
    tmdbId: 1399,
    season: 1,
    episode: 1,
  });
  const poseidonTv = tvResult.servers.find((s) => s.id === "poseidon");
  assert.ok(poseidonTv.url.startsWith("https://embed.vidrift.net/embed/tv/1399/1/1?"));

  const animeResult = resolveGreekGodSources({
    id: "anilist-16498",
    type: "anime",
    anilistId: 16498,
    episode: 1,
  });
  const poseidonAnime = animeResult.servers.find((s) => s.id === "poseidon");
  assert.ok(poseidonAnime.url.startsWith("https://embed.vidrift.net/embed/anilist/16498/1?"));
});

test("Hades (vidstuck) generates movie and TV routes with branding, color, overlay and controls", () => {
  const movieResult = resolveGreekGodSources({
    id: "movie-299534",
    type: "movie",
    tmdbId: 299534,
    progress: 120,
  });

  const hadesMovie = movieResult.servers.find((s) => s.id === "hades");
  assert.ok(hadesMovie);
  assert.equal(hadesMovie.name, "Hades");
  assert.equal(hadesMovie.provider, "vidstuck");
  assert.ok(hadesMovie.url.startsWith("https://vidstuck.cc/embed/movie/299534?"));
  assert.match(hadesMovie.url, /color=DC2626/);
  assert.match(hadesMovie.url, /branding=DIVINE/);
  assert.match(hadesMovie.url, /subtitle=english/);
  assert.match(hadesMovie.url, /overlay=true/);
  assert.match(hadesMovie.url, /progress=120/);

  const tvResult = resolveGreekGodSources({
    id: "tv-1399",
    type: "series",
    tmdbId: 1399,
    season: 1,
    episode: 1,
  });

  const hadesTv = tvResult.servers.find((s) => s.id === "hades");
  assert.ok(hadesTv);
  assert.ok(hadesTv.url.startsWith("https://vidstuck.cc/embed/tv/1399/1/1?"));
  assert.match(hadesTv.url, /nextEpisode=true/);
  assert.match(hadesTv.url, /episodeSelector=true/);
  assert.match(hadesTv.url, /autoplayNextEpisode=true/);
});

test("Apollo (vidbolt) generates movie, TV, and anime routes with custom theme, startAt, and mobileSheets", () => {
  const movieResult = resolveGreekGodSources({
    id: "movie-1007757",
    type: "movie",
    tmdbId: 1007757,
    progress: 120,
  });

  const apolloMovie = movieResult.servers.find((s) => s.id === "apollo");
  assert.ok(apolloMovie);
  assert.equal(apolloMovie.name, "Apollo");
  assert.equal(apolloMovie.provider, "vidbolt");
  assert.ok(apolloMovie.url.startsWith("https://vidbolt.xyz/movie/1007757?"));
  assert.match(apolloMovie.url, /theme=dc2626/);
  assert.match(apolloMovie.url, /autoPlay=true/);
  assert.match(apolloMovie.url, /startAt=120/);
  assert.match(apolloMovie.url, /mobileSheets=true/);

  const tvResult = resolveGreekGodSources({
    id: "tv-1399",
    type: "series",
    tmdbId: 1399,
    season: 2,
    episode: 5,
  });

  const apolloTv = tvResult.servers.find((s) => s.id === "apollo");
  assert.ok(apolloTv);
  assert.ok(apolloTv.url.startsWith("https://vidbolt.xyz/tv/1399/2/5?"));
  assert.match(apolloTv.url, /theme=dc2626/);
  assert.match(apolloTv.url, /autoPlay=true/);
  assert.match(apolloTv.url, /mobileSheets=true/);

  const animeResult = resolveGreekGodSources({
    id: "anilist-16498",
    type: "anime",
    anilistId: 16498,
    episode: 1,
  });

  const apolloAnime = animeResult.servers.find((s) => s.id === "apollo");
  assert.ok(apolloAnime);
  assert.ok(apolloAnime.url.startsWith("https://vidbolt.xyz/anime/16498/1?"));
  assert.match(apolloAnime.url, /theme=dc2626/);
  assert.match(apolloAnime.url, /mobileSheets=true/);

  const malAnimeResult = resolveGreekGodSources({
    id: "anime-52991",
    type: "anime",
    anilistId: 52991,
    episode: 2,
    idType: "mal",
  });

  const apolloMal = malAnimeResult.servers.find((s) => s.id === "apollo");
  assert.ok(apolloMal);
  assert.ok(apolloMal.url.startsWith("https://vidbolt.xyz/anime/52991/2?"));
  assert.match(apolloMal.url, /idType=mal/);
});

test("Hermes (Rivestream) generates movie and TV embed routes with optional aggregator and torrent modes", () => {
  const movieResult = resolveGreekGodSources({
    id: "movie-533535",
    type: "movie",
    tmdbId: 533535,
  });

  const hermesMovie = movieResult.servers.find((s) => s.id === "hermes");
  assert.ok(hermesMovie);
  assert.equal(hermesMovie.name, "Hermes");
  assert.equal(hermesMovie.provider, "Rivestream");
  assert.equal(hermesMovie.type, "embed");
  assert.equal(hermesMovie.url, "https://www.rivestream.app/embed?type=movie&id=533535");

  const tvResult = resolveGreekGodSources({
    id: "tv-1396",
    type: "series",
    tmdbId: 1396,
    season: 1,
    episode: 1,
  });

  const hermesTv = tvResult.servers.find((s) => s.id === "hermes");
  assert.ok(hermesTv);
  assert.equal(hermesTv.url, "https://www.rivestream.app/embed?type=tv&id=1396&season=1&episode=1");

  const aggResult = resolveGreekGodSources({
    id: "movie-533535",
    type: "movie",
    tmdbId: 533535,
    subType: "agg",
  });
  const hermesAgg = aggResult.servers.find((s) => s.id === "hermes");
  assert.equal(hermesAgg.url, "https://www.rivestream.app/embed/agg?type=movie&id=533535");

  const torrentResult = resolveGreekGodSources({
    id: "tv-1396",
    type: "series",
    tmdbId: 1396,
    season: 1,
    episode: 1,
    subType: "torrent",
  });
  const hermesTorrent = torrentResult.servers.find((s) => s.id === "hermes");
  assert.equal(hermesTorrent.url, "https://www.rivestream.app/embed/torrent?type=tv&id=1396&season=1&episode=1");
});

test("Ares (Cinezo) generates movie, TV, and anime embed routes customized to DIVINE theme", () => {
  const movieResult = resolveGreekGodSources({
    id: "movie-533535",
    type: "movie",
    tmdbId: 533535,
  });

  const aresMovie = movieResult.servers.find((s) => s.id === "ares");
  assert.ok(aresMovie);
  assert.equal(aresMovie.name, "Ares");
  assert.equal(aresMovie.provider, "Cinezo");
  assert.equal(aresMovie.type, "embed");
  assert.ok(aresMovie.url.startsWith("https://player.cinezo.live/embed/movie/533535?"));
  assert.match(aresMovie.url, /primarycolor=dc2626/);
  assert.match(aresMovie.url, /secondarycolor=ef4444/);
  assert.match(aresMovie.url, /iconcolor=ffffff/);
  assert.match(aresMovie.url, /font=Inter/);
  assert.match(aresMovie.url, /fontcolor=ffffff/);
  assert.match(aresMovie.url, /autoplay=true/);
  assert.match(aresMovie.url, /poster=true/);
  assert.match(aresMovie.url, /pip=true/);
  assert.match(aresMovie.url, /chromecast=true/);
  assert.match(aresMovie.url, /setting=true/);

  const tvResult = resolveGreekGodSources({
    id: "tv-1396",
    type: "series",
    tmdbId: 1396,
    season: 2,
    episode: 4,
  });

  const aresTv = tvResult.servers.find((s) => s.id === "ares");
  assert.ok(aresTv);
  assert.ok(aresTv.url.startsWith("https://player.cinezo.live/embed/tv/1396/2/4?"));
  assert.match(aresTv.url, /primarycolor=dc2626/);

  const animeResult = resolveGreekGodSources({
    id: "anilist-16498",
    type: "anime",
    anilistId: 16498,
    episode: 1,
    dub: true,
  });

  const aresAnime = animeResult.servers.find((s) => s.id === "ares");
  assert.ok(aresAnime);
  assert.ok(aresAnime.url.startsWith("https://player.cinezo.live/embed/anime/16498/1?"));
  assert.match(aresAnime.url, /dub=true/);
});

test("Atlas (atlantic) generates movie and TV embed routes", () => {
  const movieResult = resolveGreekGodSources({
    id: "movie-533535",
    type: "movie",
    tmdbId: 533535,
    progress: 120,
  });

  const atlasMovie = movieResult.servers.find((s) => s.id === "atlas");
  assert.ok(atlasMovie);
  assert.equal(atlasMovie.name, "Atlas");
  assert.equal(atlasMovie.provider, "Atlantic");
  assert.equal(atlasMovie.type, "embed");
  assert.ok(atlasMovie.url.startsWith("https://atlantic.st/embed/movie/533535"));
  assert.match(atlasMovie.url, /autoplay=true/);
  assert.match(atlasMovie.url, /progress=120/);

  const tvResult = resolveGreekGodSources({
    id: "tv-1396",
    type: "series",
    tmdbId: 1396,
    season: 1,
    episode: 1,
  });

  const atlasTv = tvResult.servers.find((s) => s.id === "atlas");
  assert.ok(atlasTv);
  assert.ok(atlasTv.url.startsWith("https://atlantic.st/embed/tv/1396/1/1"));
});

test("Ramayana: Rise of a Legend resolves verified PlayDrive (HD) embed server as default", () => {
  const result = resolveGreekGodSources({
    id: "ramayana-rise-of-a-legend",
    type: "movie",
    tmdbId: 656908,
  });

  assert.equal(result.default, "playdrive", "PlayDrive should be the default server for Ramayana");
  const playdrive = result.servers.find((s) => s.id === "playdrive");
  assert.ok(playdrive, "PlayDrive server should exist in servers list");
  assert.equal(playdrive.name, "PlayDrive (HD)");
  assert.equal(playdrive.provider, "PlayDrive VIP");
  assert.equal(playdrive.type, "embed");
  assert.equal(playdrive.status, "online");
  assert.equal(playdrive.url, "https://playdrive.vip/e/AQGrE48AAgDqcw?stream=hd");

  // Ensure standard Greek God servers are also available as fallbacks
  const poseidon = result.servers.find((s) => s.id === "poseidon");
  assert.ok(poseidon);
  const zeus = result.servers.find((s) => s.id === "zeus");
  assert.ok(zeus);
  const hera = result.servers.find((s) => s.id === "hera");
  assert.ok(hera);
});
