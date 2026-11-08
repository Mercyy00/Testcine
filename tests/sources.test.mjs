import test from "node:test";
import assert from "node:assert/strict";
import { resolveSources } from "../lib/sources.mjs";
import handler from "../pages/api/sources.js";

const origins = {
  STREAM_BOREAS_ORIGIN: "https://east.example.com/library/",
  STREAM_KRATOS_ORIGIN: "https://eu.example.com",
  STREAM_ZEUS_ORIGIN: "https://backup.example.com",
};

test("returns configured mirrors for the same movie and preferred server", () => {
  const result = resolveSources({ id: "movie-123", type: "movie" }, {
    ...origins, STREAM_DEFAULT_SERVER: "kratos",
  });
  assert.equal(result.default, "kratos");
  assert.deepEqual(result.servers.map((server) => server.url), [
    "https://east.example.com/library/media/movie/movie-123/master.m3u8",
    "https://eu.example.com/media/movie/movie-123/master.m3u8",
    "https://backup.example.com/media/movie/movie-123/master.m3u8",
  ]);
});

test("resolves episode and season paths, including the existing ep query", () => {
  const result = resolveSources({ id: "tv-42", type: "tv", season: "2", ep: "3" }, origins);
  assert.match(result.servers[0].url, /media\/series\/tv-42\/season-2\/episode-3\/master.m3u8$/);
  assert.match(resolveSources({ id: "show", type: "anime" }, origins).servers[0].url,
    /media\/anime\/show\/season-1\/episode-1\/master.m3u8$/);
});

test("omits unconfigured nodes and excludes offline nodes from the default", () => {
  const result = resolveSources({ id: "movie", type: "movie" }, {
    STREAM_BOREAS_ORIGIN: origins.STREAM_BOREAS_ORIGIN,
    STREAM_BOREAS_STATUS: "offline",
    STREAM_ZEUS_ORIGIN: origins.STREAM_ZEUS_ORIGIN,
  });
  assert.equal(result.default, "zeus");
  assert.equal(result.servers.length, 2);
  assert.equal(result.servers[0].status, "offline");
  assert.deepEqual(resolveSources({ id: "movie", type: "movie" }, {}), { servers: [], default: null });
});

test("rejects traversal, duplicate query values and invalid episodes at the boundary", () => {
  for (const query of [
    { id: "../private", type: "movie" }, { id: ["a", "b"], type: "movie" },
    { id: "movie", type: "unknown" }, { id: "movie", type: "movie", ep: "2" },
    { id: "show", type: "series", ep: "0" }, { id: "show", type: "anime", season: "1.5" },
    { id: "show", type: "series", ep: "2", episode: "3" },
  ]) assert.throws(() => resolveSources(query, origins), { status: 400 });
});

test("rejects unsafe origin configuration while allowing local development", () => {
  for (const origin of ["javascript:alert(1)", "https://user:password@example.com", "https://cdn.example.com?token=secret", "http://cdn.example.com"]) {
    assert.throws(() => resolveSources({ id: "movie", type: "movie" }, {
      STREAM_BOREAS_ORIGIN: origin, NODE_ENV: "production",
    }), { status: 500 });
  }
  assert.equal(resolveSources({ id: "movie", type: "movie" }, {
    STREAM_BOREAS_ORIGIN: "http://127.0.0.1:4174", NODE_ENV: "development",
  }).servers.length, 1);
});

test("API rejects non-GET methods with Allow and avoids caching stream URLs", async () => {
  const response = { headers: {}, setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.code = value; return this; }, json(value) { this.body = value; return this; } };
  await handler({ method: "POST", query: {}, headers: {} }, response);
  assert.equal(response.code, 405);
  assert.equal(response.headers.Allow, "GET");
  await handler({ method: "GET", query: { id: "../secret", type: "movie" }, headers: {} }, response);
  assert.equal(response.code, 400);
  assert.equal(response.headers["Cache-Control"], "private, no-store");
  assert.equal(typeof response.body.error, "string");
});
