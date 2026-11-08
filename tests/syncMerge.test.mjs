import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeHistory,
  mergeWatchlist,
  mergeUserData,
  cleanSettingsForSync,
} from "../lib/syncMerge.js";

test("mergeHistory prefers latest watched timestamp per title/season/episode", () => {
  const server = [
    { id: "movie-1", season: 0, episode: 0, progress: 0.5, at: 1000 },
    { id: "tv-1", season: 1, episode: 1, progress: 0.2, at: 500 },
  ];
  const local = [
    { id: "movie-1", season: 0, episode: 0, progress: 0.8, at: 2000 }, // newer
    { id: "tv-1", season: 1, episode: 1, progress: 0.1, at: 300 }, // older
    { id: "tv-1", season: 1, episode: 2, progress: 0.4, at: 1500 },
  ];

  const merged = mergeHistory(server, local);
  assert.equal(merged.length, 3);

  const m1 = merged.find((x) => x.id === "movie-1");
  assert.equal(m1.progress, 0.8);
  assert.equal(m1.at, 2000);

  const tv1E1 = merged.find((x) => x.id === "tv-1" && x.episode === 1);
  assert.equal(tv1E1.progress, 0.2); // server was newer (500 > 300)
  assert.equal(tv1E1.at, 500);
});

test("mergeWatchlist deduplicates titles without loss", () => {
  const server = [{ id: "t1" }, { id: "t2" }];
  const local = [{ id: "t2" }, { id: "t3" }];

  const merged = mergeWatchlist(server, local);
  assert.equal(merged.length, 3);
  const ids = merged.map((x) => x.id);
  assert.deepEqual(ids, ["t2", "t3", "t1"]);
});

test("cleanSettingsForSync strips device-specific fields", () => {
  const settings = {
    autoplay: true,
    quality: "1080p",
    volume: 0.8,
    device: "Windows Chrome",
    deviceLabel: "Laptop",
    tmdbKey: "secret-key",
  };

  const cleaned = cleanSettingsForSync(settings);
  assert.equal(cleaned.autoplay, true);
  assert.equal(cleaned.quality, "1080p");
  assert.equal(cleaned.volume, undefined);
  assert.equal(cleaned.device, undefined);
  assert.equal(cleaned.deviceLabel, undefined);
  assert.equal(cleaned.tmdbKey, undefined);
});

test("mergeUserData produces valid schemaVersion 1 output", () => {
  const result = mergeUserData(
    {
      history: [{ id: "m1", at: 100 }],
      watchlist: [{ id: "w1" }],
      extras: { settings: { theme: "dark" } },
    },
    {
      history: [{ id: "m2", at: 200 }],
      list: [{ id: "w2" }],
      settings: { autoplay: true, volume: 0.5 },
    }
  );

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.history.length, 2);
  assert.equal(result.watchlist.length, 2);
  assert.equal(result.extras.settings.theme, "dark");
  assert.equal(result.extras.settings.autoplay, true);
  assert.equal(result.extras.settings.volume, undefined);
});
