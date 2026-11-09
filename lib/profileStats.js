/**
 * lib/profileStats.js
 * Pure analytics and calculation functions for user profiles and activity heatmaps.
 * Strictly uses local calendar dates to honor the user's timezone.
 */

/**
 * Returns YYYY-MM-DD formatted string in the viewer's local timezone.
 */
export function getLocalDateString(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a local Date object set at noon to safely avoid DST issues.
 */
export function parseLocalDate(dayStr) {
  if (!dayStr || typeof dayStr !== "string") return new Date();
  const [y, m, d] = dayStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/**
 * Formats a date into "Sep 14, 2026" or "Mon, Sep 14"
 */
export function formatDateLabel(dateInput, includeYear = true) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const options = includeYear
    ? { month: "short", day: "numeric", year: "numeric" }
    : { weekday: "short", month: "short", day: "numeric" };
  return d.toLocaleDateString("en-US", options);
}

/**
 * Formats relative date ("Today", "Yesterday", or "Sep 14")
 */
export function formatRelativeDate(dateInput, referenceDate = new Date()) {
  const targetDay = getLocalDateString(dateInput);
  const todayStr = getLocalDateString(referenceDate);

  const ref = parseLocalDate(todayStr);
  const yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  if (targetDay === todayStr) return "Today";
  if (targetDay === yesterdayStr) return "Yesterday";
  return formatDateLabel(parseLocalDate(targetDay), false);
}

/**
 * Maps minutes watched in a day to heatmap levels 0 - 4:
 * 0: 0 mins
 * 1: 1 - 29 mins
 * 2: 30 - 89 mins
 * 3: 90 - 179 mins
 * 4: 180+ mins
 */
export function minutesToLevel(minutes) {
  if (!minutes || minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 90) return 2;
  if (minutes < 180) return 3;
  return 4;
}

/**
 * Formats total minutes into human readable text: "1h 20m", "45m", "12h"
 * If showEmDashIfZero is true and minutes <= 0, returns "—"
 */
export function formatMinutes(totalMinutes, showEmDashIfZero = false) {
  const mins = Math.round(totalMinutes || 0);
  if (mins <= 0) return showEmDashIfZero ? "—" : "0m";
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours > 0 && remMins > 0) return `${hours}h ${remMins}m`;
  if (hours > 0) return `${hours}h`;
  return `${remMins}m`;
}

/**
 * Key of a watch log row
 */
export const keyOfLog = (row) =>
  `${row?.day}:${row?.titleId}:${row?.season || 0}:${row?.episode || 0}`;

/**
 * Records watched delta seconds into the watch log.
 * Updates an existing row or inserts a new row for (day, titleId, season, episode).
 * Caps the log at 2000 rows (dropping oldest).
 */
export function recordWatchDelta({
  log = [],
  day = getLocalDateString(),
  titleId,
  season,
  episode,
  deltaSeconds = 0,
  title,
  poster,
  type,
  genres,
  runtime,
}) {
  if (!titleId || deltaSeconds <= 0) return log || [];
  const sNum = season ? Number(season) : 0;
  const epNum = episode ? Number(episode) : 0;
  const targetKey = `${day}:${titleId}:${sNum}:${epNum}`;

  let matched = false;
  const updated = (log || []).map((row) => {
    const k = keyOfLog(row);
    if (k === targetKey) {
      matched = true;
      return {
        ...row,
        seconds: (row.seconds || 0) + deltaSeconds,
        title: title || row.title,
        poster: poster || row.poster,
        type: type || row.type,
        genres: genres || row.genres,
        runtime: runtime || row.runtime,
        estimated: false,
      };
    }
    return row;
  });

  if (!matched) {
    updated.unshift({
      day,
      titleId,
      ...(season ? { season: sNum } : {}),
      ...(episode ? { episode: epNum } : {}),
      seconds: deltaSeconds,
      ...(title ? { title } : {}),
      ...(poster ? { poster } : {}),
      ...(type ? { type } : {}),
      ...(genres ? { genres } : {}),
      ...(runtime ? { runtime } : {}),
      estimated: false,
    });
  }

  return updated.slice(0, 2000);
}

/**
 * One-time migration for existing history entries that have no watch log rows.
 * Computes seconds = progress * runtime * 60 (marked estimated: true).
 */
export function migrateHistoryToWatchLog(history = [], existingLog = []) {
  if (!Array.isArray(history) || history.length === 0) return existingLog || [];
  const logMap = new Set((existingLog || []).map(keyOfLog));
  const additions = [];

  for (const entry of history) {
    if (!entry?.id || !entry.at) continue;
    const day = getLocalDateString(entry.at);
    const sNum = entry.season ? Number(entry.season) : 0;
    const epNum = entry.episode ? Number(entry.episode) : 0;
    const k = `${day}:${entry.id}:${sNum}:${epNum}`;

    if (!logMap.has(k)) {
      logMap.add(k);
      const runtimeMinutes = entry.title?.runtime || 90;
      const progress = typeof entry.progress === "number" ? entry.progress : 0.5;
      const seconds = Math.round(progress * runtimeMinutes * 60);

      additions.push({
        day,
        titleId: entry.id,
        ...(entry.season ? { season: sNum } : {}),
        ...(entry.episode ? { episode: epNum } : {}),
        seconds: Math.max(60, seconds),
        title: entry.title?.title || entry.id,
        poster: entry.title?.poster || "",
        type: entry.title?.type || (entry.season ? "tv" : "movie"),
        genres: entry.title?.genres || [],
        runtime: runtimeMinutes,
        estimated: true,
      });
    }
  }

  if (additions.length === 0) return existingLog;
  return [...additions, ...(existingLog || [])].slice(0, 2000);
}

/**
 * Merges two watch logs by (day, titleId, season, episode), keeping the larger seconds.
 */
export function mergeWatchLog(serverLog = [], localLog = []) {
  const map = new Map();
  const all = [...(serverLog || []), ...(localLog || [])];
  for (const item of all) {
    if (!item?.day || !item?.titleId) continue;
    const k = keyOfLog(item);
    const existing = map.get(k);
    if (!existing) {
      map.set(k, { ...item });
    } else {
      map.set(k, {
        ...existing,
        ...item,
        seconds: Math.max(existing.seconds || 0, item.seconds || 0),
        estimated: Boolean(existing.estimated && item.estimated),
      });
    }
  }
  return [...map.values()]
    .sort((a, b) => (b.day > a.day ? 1 : b.day < a.day ? -1 : (b.seconds || 0) - (a.seconds || 0)))
    .slice(0, 2000);
}

/**
 * Calculates current and longest streaks from the watch log.
 * Consecutive active days ending today or yesterday.
 */
export function streaks(log = [], referenceDate = new Date()) {
  const activeDaysSet = new Set();
  const titlesSet = new Set();

  for (const row of log || []) {
    if (row.day && (row.seconds || 0) > 0) {
      activeDaysSet.add(row.day);
      if (row.titleId) titlesSet.add(row.titleId);
    }
  }

  const activeDays = activeDaysSet.size;
  if (activeDays === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      activeDays: 0,
      uniqueTitlesCount: 0,
    };
  }

  // Current streak calculation (must end today or yesterday)
  const todayStr = getLocalDateString(referenceDate);
  const ref = parseLocalDate(todayStr);

  const yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  let currentStreak = 0;
  let checkDate = new Date(ref);

  if (!activeDaysSet.has(todayStr)) {
    if (activeDaysSet.has(yesterdayStr)) {
      checkDate = yesterday;
    } else {
      checkDate = null;
    }
  }

  if (checkDate) {
    let curr = new Date(checkDate);
    while (activeDaysSet.has(getLocalDateString(curr))) {
      currentStreak++;
      curr.setDate(curr.getDate() - 1);
    }
  }

  // Longest streak calculation across all historical active days
  const sortedDays = Array.from(activeDaysSet).sort();
  let longestStreak = 0;
  let running = 0;
  let prevDate = null;

  for (const dayStr of sortedDays) {
    const d = parseLocalDate(dayStr);
    if (prevDate) {
      const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        running++;
      } else {
        running = 1;
      }
    } else {
      running = 1;
    }
    prevDate = d;
    if (running > longestStreak) longestStreak = running;
  }

  return {
    currentStreak,
    longestStreak,
    activeDays,
    uniqueTitlesCount: titlesSet.size,
  };
}

/**
 * Builds the activity heatmap grid and month labels.
 * Range can be "6m" (26 weeks), "12m" (52 weeks), or "this_year".
 */
export function buildHeatmap(log = [], range = "6m", referenceDate = new Date()) {
  const todayStr = getLocalDateString(referenceDate);
  const refNoon = parseLocalDate(todayStr);

  // Determine total weeks
  let totalWeeks = 26;
  if (range === "12m") totalWeeks = 52;
  else if (range === "this_year") {
    const jan1 = new Date(refNoon.getFullYear(), 0, 1, 12);
    const dayOfYear = Math.floor((refNoon.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
    totalWeeks = Math.max(1, Math.ceil((dayOfYear + 1) / 7) + 1);
  }

  // Aggregate log by day
  const dayMap = {};
  for (const row of log || []) {
    if (!row.day) continue;
    if (!dayMap[row.day]) {
      dayMap[row.day] = { seconds: 0, titles: new Map(), rows: [] };
    }
    dayMap[row.day].seconds += row.seconds || 0;
    dayMap[row.day].rows.push(row);
    if (row.titleId) {
      const existing = dayMap[row.day].titles.get(row.titleId);
      dayMap[row.day].titles.set(row.titleId, {
        titleId: row.titleId,
        title: row.title || existing?.title || row.titleId,
        poster: row.poster || existing?.poster || "",
        seconds: (existing?.seconds || 0) + (row.seconds || 0),
      });
    }
  }

  // End on the Sunday of the current week
  // d.getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
  // We want Monday = 0, ..., Sunday = 6
  const currentDayOfWeek = (refNoon.getDay() + 6) % 7;
  const endSunday = new Date(refNoon);
  endSunday.setDate(refNoon.getDate() + (6 - currentDayOfWeek));

  // Start on Monday totalWeeks ago
  const startMonday = new Date(endSunday);
  startMonday.setDate(endSunday.getDate() - (totalWeeks * 7 - 1));

  const grid = [];
  const monthLabelsMap = new Map();
  let prevMonth = -1;

  for (let w = 0; w < totalWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startMonday);
      cellDate.setDate(startMonday.getDate() + (w * 7 + d));
      const cellDayStr = getLocalDateString(cellDate);

      // Month label placement: track when month changes on the column's Monday or during column
      const cellMonth = cellDate.getMonth();
      if (d === 0) {
        if (cellMonth !== prevMonth) {
          monthLabelsMap.set(w, cellDate.toLocaleString("en-US", { month: "short" }));
          prevMonth = cellMonth;
        }
      } else if (cellDate.getDate() === 1 && !monthLabelsMap.has(w)) {
        monthLabelsMap.set(w, cellDate.toLocaleString("en-US", { month: "short" }));
        prevMonth = cellMonth;
      }

      const isToday = cellDayStr === todayStr;
      const isFuture = cellDate.getTime() > refNoon.getTime() + 12 * 3600 * 1000;
      const data = dayMap[cellDayStr];
      const seconds = isFuture ? 0 : data?.seconds || 0;
      const minutes = Math.round(seconds / 60);
      const level = isFuture ? 0 : minutesToLevel(minutes);
      const isFocusable = !isFuture;

      const titlesList = data ? Array.from(data.titles.values()) : [];
      const titlesCount = titlesList.length;

      // Aria label formatting
      const dateFormatted = formatDateLabel(cellDate);
      let ariaLabel;
      if (isFuture) {
        ariaLabel = `${dateFormatted}: Future date`;
      } else if (minutes === 0) {
        ariaLabel = `${dateFormatted}: No activity`;
      } else {
        const titleStr = titlesCount === 1 ? "1 title" : `${titlesCount} titles`;
        ariaLabel = `${dateFormatted}: ${titleStr}, ${formatMinutes(minutes)}`;
      }

      grid.push({
        day: cellDayStr,
        date: cellDate,
        weekIndex: w,
        dayOfWeek: d, // 0=Mon..6=Sun
        seconds,
        minutes,
        level,
        isToday,
        isFuture,
        isFocusable,
        ariaLabel,
        titlesCount,
        titles: titlesList,
      });
    }
  }

  const monthLabels = Array.from(monthLabelsMap.entries()).map(([colIndex, label]) => ({
    colIndex,
    label,
  }));

  return {
    grid,
    monthLabels,
    totalWeeks,
    range,
  };
}

/**
 * Returns detail rows for titles watched on a specific day.
 */
export function dayDetails(log = [], dayStr, titlesById = {}) {
  if (!dayStr) return [];
  const rows = (log || []).filter((r) => r.day === dayStr);
  if (rows.length === 0) return [];

  // Group by (titleId, season, episode)
  const map = new Map();
  for (const r of rows) {
    const k = `${r.titleId}:${r.season || 0}:${r.episode || 0}`;
    const card = titlesById[r.titleId] || {};
    const existing = map.get(k);
    const secs = (existing?.seconds || 0) + (r.seconds || 0);

    const title = r.title || card.title || r.titleId;
    const poster = r.poster || card.poster || "";
    const type = r.type || card.type || (r.season ? "tv" : "movie");
    const runtime = r.runtime || card.runtime || 0;

    let continueUrl = `/watch/${encodeURIComponent(r.titleId)}`;
    if (r.season && r.episode) {
      continueUrl += `?season=${r.season}&episode=${r.episode}`;
    }
    const detailsUrl = `/title/${encodeURIComponent(r.titleId)}`;

    map.set(k, {
      titleId: r.titleId,
      season: r.season,
      episode: r.episode,
      seconds: secs,
      minutes: Math.round(secs / 60),
      title,
      poster,
      type,
      runtime,
      continueUrl,
      detailsUrl,
    });
  }

  return Array.from(map.values()).sort((a, b) => b.seconds - a.seconds);
}

/**
 * Computes top genres, hours per genre, and movie vs series vs anime ratios from watch log.
 */
export function genreStats(log = [], titlesById = {}) {
  const genreSeconds = {};
  const genreTitlesMap = {};
  const uniqueTitles = new Set();
  const titleTypeMap = {};
  let totalSeconds = 0;

  let movies = 0;
  let series = 0;
  let anime = 0;

  for (const row of log || []) {
    if (!row.titleId || !row.seconds) continue;
    uniqueTitles.add(row.titleId);
    totalSeconds += row.seconds;
    if (row.type) titleTypeMap[row.titleId] = row.type;

    const card = titlesById[row.titleId] || {};
    const genres = card.genres?.length ? card.genres : row.genres || [];
    const titleName = row.title || card.title || row.titleId;

    if (genres.length > 0) {
      const splitSecs = row.seconds / genres.length;
      for (const g of genres) {
        genreSeconds[g] = (genreSeconds[g] || 0) + splitSecs;
        if (!genreTitlesMap[g]) genreTitlesMap[g] = new Set();
        genreTitlesMap[g].add(titleName);
      }
    }
  }

  // Type ratio: accurately handles movies, series, and anime
  for (const tid of uniqueTitles) {
    const card = titlesById[tid] || {};
    const tType = (card.type || titleTypeMap[tid] || "").toLowerCase();
    const isAnime = tType === "anime" || card.isAnime || (card.genres || []).includes("Anime");
    if (isAnime) anime++;
    else if (tType === "movie") movies++;
    else series++;
  }

  const totalTypes = movies + series + anime;
  const moviePct = totalTypes > 0 ? Math.round((movies / totalTypes) * 100) : 0;
  const seriesPct = totalTypes > 0 ? Math.round((series / totalTypes) * 100) : 0;
  const animePct = totalTypes > 0 ? Math.max(0, 100 - moviePct - seriesPct) : 0;

  const sortedGenres = Object.entries(genreSeconds).sort((a, b) => b[1] - a[1]);
  const genres = sortedGenres.slice(0, 5).map(([name, secs]) => {
    const mins = Math.round(secs / 60);
    const hours = formatMinutes(mins, true);
    const percent = totalSeconds > 0 ? Math.min(100, Math.round((secs / totalSeconds) * 100)) : 0;
    const titlesList = Array.from(genreTitlesMap[name] || []);
    return {
      name,
      seconds: secs,
      minutes: mins,
      hours,
      percent,
      count: titlesList.length,
      titles: titlesList,
    };
  });

  return {
    genres,
    ratio: {
      movies,
      series,
      anime,
      moviePct,
      seriesPct,
      animePct,
    },
    totalTitlesWatched: uniqueTitles.size,
    totalMinutesWatched: Math.round(totalSeconds / 60),
    totalHoursFormatted: formatMinutes(totalSeconds / 60),
  };
}
