import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAniListId,
  normalizeAniListItem,
  fetchAniListDetails,
  fetchAniListDiscover,
  searchAniList,
} from "../lib/anilist.js";
import detailsHandler from "../pages/api/anilist/details.js";
import discoverHandler from "../pages/api/anilist/discover.js";
import searchHandler from "../pages/api/anilist/search.js";

test("extractAniListId parses various ID formats correctly", () => {
  assert.equal(extractAniListId(16498), 16498);
  assert.equal(extractAniListId("16498"), 16498);
  assert.equal(extractAniListId("anilist-16498"), 16498);
  assert.equal(extractAniListId("anime-16498"), 16498);
  assert.equal(extractAniListId("anime-attack-on-titan-16498"), 16498);
  assert.equal(extractAniListId("not-an-id"), null);
  assert.equal(extractAniListId(""), null);
  assert.equal(extractAniListId(null), null);
});

test("normalizeAniListItem maps AniList data to Vivarium title schema without mixing TMDB", () => {
  const mockMedia = {
    id: 16498,
    title: {
      romaji: "Shingeki no Kyojin",
      english: "Attack on Titan",
      native: "進撃の巨人",
      userPreferred: "Shingeki no Kyojin",
    },
    format: "TV",
    status: "FINISHED",
    episodes: 25,
    duration: 24,
    seasonYear: 2013,
    averageScore: 85,
    genres: ["Action", "Drama", "Fantasy", "Mystery"],
    description: "Centuries ago, mankind was almost slaughtered to extinction.<br><br><i>Epic anime</i>",
    coverImage: {
      extraLarge: "https://s4.anilist.co/cover/16498-large.jpg",
      large: "https://s4.anilist.co/cover/16498-medium.jpg",
    },
    bannerImage: "https://s4.anilist.co/banner/16498.jpg",
    studios: {
      nodes: [{ id: 858, name: "Wit Studio" }],
    },
    trailer: {
      id: "MGRm4IzK1SQ",
      site: "youtube",
      thumbnail: "https://img.youtube.com/vi/MGRm4IzK1SQ/mqdefault.jpg",
    },
    streamingEpisodes: [
      {
        title: "Episode 1 - To You, in 2000 Years",
        thumbnail: "https://example.com/ep1.jpg",
        url: "https://crunchyroll.com/ep1",
        site: "Crunchyroll",
      },
    ],
  };

  const title = normalizeAniListItem(mockMedia);

  assert.equal(title.id, "16498");
  assert.equal(title.anilistId, 16498);
  assert.equal(title.tmdbId, null, "Anime must not have tmdbId to prevent mixing with TMDB");
  assert.equal(title.type, "anime");
  assert.equal(title.title, "Attack on Titan");
  assert.equal(title.year, 2013);
  assert.equal(title.rating, 8.5);
  assert.equal(title.studio, "Wit Studio");
  assert.equal(title.trailerKey, "MGRm4IzK1SQ");
  assert.equal(title.poster, "https://s4.anilist.co/cover/16498-large.jpg");
  assert.equal(title.backdrop, "https://s4.anilist.co/banner/16498.jpg");
  assert.match(title.overview, /Centuries ago, mankind/);
  assert.doesNotMatch(title.overview, /<br>|<\/i>/, "HTML tags must be stripped");
  assert.equal(title.episodes.length, 1);
  assert.equal(title.episodes[0].title, "Episode 1 - To You, in 2000 Years");
  assert.equal(title.seasonsList[0].seasonNumber, 1);
  assert.equal(title.seasons, 4, "Attack on Titan has 4 seasons in KNOWN_SEASONS");
  assert.equal(title.seasonsList.length, 4, "Attack on Titan seasonsList should contain 4 seasons");
});

test("normalizeAniListItem determines multiple seasons from relations and title", () => {
  const mediaWithRelations = {
    id: 99999,
    title: { english: "Custom Anime Series" },
    format: "TV",
    relations: {
      edges: [
        { relationType: "SEQUEL", node: { id: 100001, format: "TV", type: "ANIME" } },
        { relationType: "SEQUEL", node: { id: 100002, format: "TV", type: "ANIME" } },
      ],
    },
  };
  const result = normalizeAniListItem(mediaWithRelations);
  assert.equal(result.seasons, 3, "1 current + 2 sequels = 3 seasons");
  assert.equal(result.seasonsList.length, 3);
  assert.equal(result.seasonsList[2].seasonNumber, 3);

  const mediaWithTitleSeason = {
    id: 88888,
    title: { english: "Overlord Season 4" },
    format: "TV",
  };
  const titleResult = normalizeAniListItem(mediaWithTitleSeason);
  assert.ok(titleResult.seasons >= 4, "Title mentioning Season 4 should have at least 4 seasons");
  assert.equal(titleResult.seasonsList.length, titleResult.seasons);
  assert.ok(titleResult.seasonsList[1].episodes.length > 0, "Season 2 should have populated episodes");
  assert.ok(titleResult.seasonsList[2].episodes.length > 0, "Season 3 should have populated episodes");
});

test("normalizeAniListItem normalizes reverse-order streamingEpisodes so Episode 1 is always first", () => {
  const mediaReverseEps = {
    id: 21,
    title: { english: "One Piece" },
    format: "TV",
    streamingEpisodes: [
      { title: "Episode 130 - Nico Robin", thumbnail: "https://example.com/130.jpg" },
      { title: "Episode 129 - Vivi Journey", thumbnail: "https://example.com/129.jpg" },
      { title: "Episode 2 - Luffy and Zoro", thumbnail: "https://example.com/2.jpg" },
      { title: "Episode 1 - I'm Luffy!", thumbnail: "https://example.com/1.jpg" },
    ],
  };

  const normalized = normalizeAniListItem(mediaReverseEps);
  assert.equal(normalized.episodes[0].episodeNumber, 1, "First episode must be episode 1");
  assert.match(normalized.episodes[0].title, /Episode 1/);
  assert.equal(normalized.episodes[1].episodeNumber, 2);
  assert.equal(normalized.episodes[2].episodeNumber, 129);
  assert.equal(normalized.episodes[3].episodeNumber, 130);
});

test("Episode sort order strictly places Episode 1 first for oldest and last episode first for newest", () => {
  const episodes = [
    { episodeNumber: 3, title: "Episode 3" },
    { episodeNumber: 1, title: "Episode 1" },
    { episodeNumber: 25, title: "Episode 25" },
    { episodeNumber: 2, title: "Episode 2" },
  ];

  const sortEpisodes = (list, epSort) => {
    return [...list].sort((a, b) => {
      const aNum = Number(a.episodeNumber ?? a.episode_number) || 0;
      const bNum = Number(b.episodeNumber ?? b.episode_number) || 0;
      return epSort === "newest" ? bNum - aNum : aNum - bNum;
    });
  };

  const oldest = sortEpisodes(episodes, "oldest");
  assert.equal(oldest[0].episodeNumber, 1, "Oldest filter must have episode 1 first");
  assert.equal(oldest[1].episodeNumber, 2);
  assert.equal(oldest[2].episodeNumber, 3);
  assert.equal(oldest[3].episodeNumber, 25);

  const newest = sortEpisodes(episodes, "newest");
  assert.equal(newest[0].episodeNumber, 25, "Newest filter must have that season's last episode first");
  assert.equal(newest[1].episodeNumber, 3);
  assert.equal(newest[2].episodeNumber, 2);
  assert.equal(newest[3].episodeNumber, 1);
});

test("fetchAniListDetails retrieves live anime details with anilistId", async () => {
  const anime = await fetchAniListDetails(16498);
  assert.ok(anime, "Expected anime details for Attack on Titan (16498)");
  assert.equal(anime.anilistId, 16498);
  assert.equal(anime.id, "16498");
  assert.ok(anime.tmdbId === 1429 || anime.tmdbId === null);
  assert.equal(anime.type, "anime");
  assert.ok(anime.title);
  assert.ok(anime.episodes && anime.episodes.length > 0);
  assert.ok(anime.poster);
});

test("fetchAniListDiscover retrieves categories (trending, top, popular)", async () => {
  const trending = await fetchAniListDiscover({ category: "trending", perPage: 5 });
  assert.ok(Array.isArray(trending));
  assert.ok(trending.length > 0);
  assert.equal(trending[0].type, "anime");
  assert.ok(trending[0].anilistId > 0);
  assert.equal(trending[0].tmdbId, null);

  const top = await fetchAniListDiscover({ category: "top", perPage: 5 });
  assert.ok(Array.isArray(top));
  assert.ok(top.length > 0);
  assert.equal(top[0].type, "anime");
});

test("searchAniList searches anime by title", async () => {
  const results = await searchAniList("Death Note", 5);
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);
  const deathNote = results.find((r) => r.title.toLowerCase().includes("death note") || r.romajiTitle?.toLowerCase().includes("death note"));
  assert.ok(deathNote, "Expected Death Note in search results");
  assert.equal(deathNote.type, "anime");
  assert.equal(deathNote.anilistId, 1535);
  assert.equal(deathNote.tmdbId, null);
});

test("AniList API details handler responds with anime JSON and rejects invalid IDs", async () => {
  function createMockRes() {
    return {
      headers: {},
      statusCode: 200,
      setHeader(k, v) {
        this.headers[k] = v;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
  }

  // Valid AniList ID
  const validRes = createMockRes();
  await detailsHandler({ method: "GET", query: { id: "16498" } }, validRes);
  assert.equal(validRes.statusCode, 200);
  assert.equal(validRes.body.anilistId, 16498);
  assert.equal(validRes.body.type, "anime");
  assert.ok(validRes.body.tmdbId === 1429 || validRes.body.tmdbId === null);

  // Missing or invalid ID
  const invalidRes = createMockRes();
  await detailsHandler({ method: "GET", query: { id: "" } }, invalidRes);
  assert.equal(invalidRes.statusCode, 400);

  const notFoundRes = createMockRes();
  await detailsHandler({ method: "GET", query: { id: "notanid" } }, notFoundRes);
  assert.equal(notFoundRes.statusCode, 400);
});

test("AniList API discover and search handlers return arrays", async () => {
  function createMockRes() {
    return {
      headers: {},
      statusCode: 200,
      setHeader(k, v) {
        this.headers[k] = v;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
  }

  const discoverRes = createMockRes();
  await discoverHandler({ method: "GET", query: { category: "trending", limit: "4" } }, discoverRes);
  assert.equal(discoverRes.statusCode, 200);
  assert.ok(Array.isArray(discoverRes.body));
  assert.ok(discoverRes.body.length > 0);

  const searchRes = createMockRes();
  await searchHandler({ method: "GET", query: { q: "Naruto", limit: "3" } }, searchRes);
  assert.equal(searchRes.statusCode, 200);
  assert.ok(Array.isArray(searchRes.body));
  assert.ok(searchRes.body.length > 0);
  assert.equal(searchRes.body[0].type, "anime");
});
