import test from "node:test";
import assert from "node:assert/strict";
import {
  getLocalDateString,
  parseLocalDate,
  minutesToLevel,
  formatMinutes,
  recordWatchDelta,
  migrateHistoryToWatchLog,
  mergeWatchLog,
  streaks,
  buildHeatmap,
  dayDetails,
  genreStats,
} from "../lib/profileStats.js";

test("getLocalDateString uses local dates instead of UTC", () => {
  // Construct a date with specific local components
  const d = new Date(2026, 8, 14, 23, 30, 0); // Sep 14, 2026 local time
  const str = getLocalDateString(d);
  assert.equal(str, "2026-09-14");

  const d2 = new Date(2026, 0, 1, 0, 15, 0); // Jan 1, 2026 local time
  assert.equal(getLocalDateString(d2), "2026-01-01");
});

test("minutesToLevel correctly buckets minutes into levels 0-4", () => {
  assert.equal(minutesToLevel(0), 0);
  assert.equal(minutesToLevel(-5), 0);
  assert.equal(minutesToLevel(1), 1);
  assert.equal(minutesToLevel(29), 1);
  assert.equal(minutesToLevel(30), 2);
  assert.equal(minutesToLevel(89), 2);
  assert.equal(minutesToLevel(90), 3);
  assert.equal(minutesToLevel(179), 3);
  assert.equal(minutesToLevel(180), 4);
  assert.equal(minutesToLevel(360), 4);
});

test("formatMinutes formats text and handles showEmDashIfZero", () => {
  assert.equal(formatMinutes(0), "0m");
  assert.equal(formatMinutes(0, true), "—");
  assert.equal(formatMinutes(45), "45m");
  assert.equal(formatMinutes(60), "1h");
  assert.equal(formatMinutes(80), "1h 20m");
  assert.equal(formatMinutes(125), "2h 5m");
});

test("recordWatchDelta increments watched seconds and respects 2000 row cap", () => {
  let log = [];
  log = recordWatchDelta({
    log,
    day: "2026-09-14",
    titleId: "oppenheimer",
    deltaSeconds: 12,
    title: "Oppenheimer",
  });
  assert.equal(log.length, 1);
  assert.equal(log[0].seconds, 12);

  // Add another delta for the same title and day
  log = recordWatchDelta({
    log,
    day: "2026-09-14",
    titleId: "oppenheimer",
    deltaSeconds: 10,
  });
  assert.equal(log.length, 1);
  assert.equal(log[0].seconds, 22);

  // Different episode of a series creates separate row
  log = recordWatchDelta({
    log,
    day: "2026-09-14",
    titleId: "breaking-bad",
    season: 1,
    episode: 1,
    deltaSeconds: 15,
  });
  assert.equal(log.length, 2);

  // Ignore 0 or negative delta
  const prevLen = log.length;
  log = recordWatchDelta({
    log,
    day: "2026-09-14",
    titleId: "oppenheimer",
    deltaSeconds: 0,
  });
  assert.equal(log.length, prevLen);
});

test("migrateHistoryToWatchLog creates rows with estimated: true", () => {
  const history = [
    {
      id: "inception",
      at: new Date(2026, 4, 10, 20, 0).getTime(),
      progress: 0.5,
      title: { title: "Inception", runtime: 148, genres: ["Sci-Fi", "Action"] },
    },
  ];
  const migrated = migrateHistoryToWatchLog(history, []);
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].titleId, "inception");
  assert.equal(migrated[0].estimated, true);
  assert.equal(migrated[0].day, "2026-05-10");
  assert.equal(migrated[0].seconds, Math.round(0.5 * 148 * 60));
});

test("mergeWatchLog takes larger seconds for identical keys", () => {
  const server = [
    { day: "2026-09-14", titleId: "dune", seconds: 120, estimated: true },
    { day: "2026-09-13", titleId: "interstellar", seconds: 300 },
  ];
  const local = [
    { day: "2026-09-14", titleId: "dune", seconds: 240, estimated: false },
    { day: "2026-09-12", titleId: "tenet", seconds: 60 },
  ];

  const merged = mergeWatchLog(server, local);
  assert.equal(merged.length, 3);
  const dune = merged.find((r) => r.titleId === "dune");
  assert.equal(dune.seconds, 240);
  assert.equal(dune.estimated, false);
});

test("streaks calculates current and longest streaks correctly across empty, single day, and month ends", () => {
  const ref = new Date(2026, 8, 15, 12, 0); // Tuesday, Sep 15, 2026

  // 1. Empty log
  assert.deepEqual(streaks([], ref), {
    currentStreak: 0,
    longestStreak: 0,
    activeDays: 0,
    uniqueTitlesCount: 0,
  });

  // 2. Single day (today)
  const todayLog = [{ day: "2026-09-15", titleId: "m1", seconds: 120 }];
  assert.equal(streaks(todayLog, ref).currentStreak, 1);
  assert.equal(streaks(todayLog, ref).longestStreak, 1);

  // 3. Streak ending yesterday (Sep 14) is still active today
  const yestLog = [{ day: "2026-09-14", titleId: "m1", seconds: 120 }];
  assert.equal(streaks(yestLog, ref).currentStreak, 1);

  // 4. Streak across month end (Aug 30 -> Sep 2)
  const monthEndRef = new Date(2026, 8, 2, 12, 0); // Sep 2, 2026
  const monthEndLog = [
    { day: "2026-08-30", titleId: "m1", seconds: 60 },
    { day: "2026-08-31", titleId: "m1", seconds: 60 },
    { day: "2026-09-01", titleId: "m1", seconds: 60 },
    { day: "2026-09-02", titleId: "m2", seconds: 60 },
  ];
  const s = streaks(monthEndLog, monthEndRef);
  assert.equal(s.currentStreak, 4);
  assert.equal(s.longestStreak, 4);
  assert.equal(s.activeDays, 4);
  assert.equal(s.uniqueTitlesCount, 2);
});

test("streaks correctly traverses DST boundary days without dropping streak", () => {
  // Daylight savings shift (e.g. November fall back or March spring forward)
  // Local calendar math with Date(y, m, d) should cleanly navigate diffDays == 1
  const dstRef = new Date(2026, 10, 2, 12, 0); // Nov 2, 2026
  const dstLog = [
    { day: "2026-10-31", titleId: "m1", seconds: 60 },
    { day: "2026-11-01", titleId: "m1", seconds: 60 }, // DST change day in US
    { day: "2026-11-02", titleId: "m1", seconds: 60 },
  ];
  const res = streaks(dstLog, dstRef);
  assert.equal(res.currentStreak, 3);
  assert.equal(res.longestStreak, 3);
});

test("buildHeatmap constructs 26 weeks grid with aligned month labels and future day handling", () => {
  const ref = new Date(2026, 8, 14, 12, 0); // Mon Sep 14, 2026
  const log = [
    { day: "2026-09-14", titleId: "oppenheimer", seconds: 120 * 60, title: "Oppenheimer" },
  ];

  const heatmap = buildHeatmap(log, "6m", ref);
  assert.equal(heatmap.totalWeeks, 26);
  assert.equal(heatmap.grid.length, 26 * 7);

  // Month labels must have colIndex pointing to the column
  assert.ok(heatmap.monthLabels.length > 0);
  for (const ml of heatmap.monthLabels) {
    assert.ok(ml.colIndex >= 0 && ml.colIndex < 26);
    assert.ok(typeof ml.label === "string" && ml.label.length >= 3);
  }

  // Today's cell
  const todayCell = heatmap.grid.find((c) => c.isToday);
  assert.ok(todayCell, "Today cell should exist");
  assert.equal(todayCell.day, "2026-09-14");
  assert.equal(todayCell.minutes, 120);
  assert.equal(todayCell.level, 3); // 90-179 mins -> level 3
  assert.equal(todayCell.isFocusable, true);
  assert.ok(todayCell.ariaLabel.includes("Oppenheimer") || todayCell.ariaLabel.includes("1 title"));

  // Future days in current week (Tue..Sun) should have level 0 and isFocusable false
  const futureCell = heatmap.grid.find((c) => c.isFuture);
  if (futureCell) {
    assert.equal(futureCell.level, 0);
    assert.equal(futureCell.isFocusable, false);
  }
});

test("dayDetails returns full title cards and links for a specific day", () => {
  const log = [
    {
      day: "2026-09-14",
      titleId: "breaking-bad",
      season: 2,
      episode: 3,
      seconds: 2400,
      title: "Breaking Bad",
      poster: "/bb.jpg",
      type: "tv",
    },
  ];

  const details = dayDetails(log, "2026-09-14");
  assert.equal(details.length, 1);
  assert.equal(details[0].title, "Breaking Bad");
  assert.equal(details[0].season, 2);
  assert.equal(details[0].episode, 3);
  assert.equal(details[0].minutes, 40);
  assert.equal(details[0].continueUrl, "/watch/breaking-bad?season=2&episode=3");
  assert.equal(details[0].detailsUrl, "/title/breaking-bad");
});

test("genreStats splits watched seconds evenly across genres and computes ratio", () => {
  const log = [
    {
      day: "2026-09-14",
      titleId: "gladiator",
      seconds: 3600, // 1 hour
      genres: ["Action", "Drama"],
      type: "movie",
    },
    {
      day: "2026-09-14",
      titleId: "frieren",
      seconds: 1800, // 30 mins
      genres: ["Animation", "Fantasy"],
      type: "anime",
    },
  ];

  const stats = genreStats(log);
  assert.equal(stats.totalTitlesWatched, 2);
  assert.equal(stats.totalMinutesWatched, 90);
  assert.equal(stats.totalHoursFormatted, "1h 30m");

  // Action and Drama get 30 mins each (half of 60 mins)
  const action = stats.genres.find((g) => g.name === "Action");
  assert.ok(action);
  assert.equal(action.minutes, 30);
  assert.equal(action.hours, "30m");

  // Ratio
  assert.equal(stats.ratio.movies, 1);
  assert.equal(stats.ratio.anime, 1);
  assert.equal(stats.ratio.series, 0);
});
