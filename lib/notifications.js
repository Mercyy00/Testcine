/**
 * Build episode alerts and schedule reminders.
 * Supports:
 * - Airing Today releases (with unread badge counter)
 * - Upcoming releases This Week
 * - In-app dismissal and read tracking ("if skipped then it moves accordingly")
 */
export function buildDynamicNotifications({
  history = [],
  watchlist = [],
  schedule = [],
  readIds = [],
  dismissedIds = [],
}) {
  const readSet = new Set(readIds || []);
  const dismissedSet = new Set(dismissedIds || []);

  // Merge scheduled reminders, watch history, and watchlist titles
  const rawEntries = [...(schedule || []), ...(history || []), ...(watchlist || [])];
  const titles = rawEntries
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === "string") return { id: entry };
      if (entry.title && typeof entry.title === "object") {
        return { ...entry.title, ...entry };
      }
      return entry;
    })
    .filter((title, index, list) => title?.id && list.findIndex((item) => item?.id === title.id) === index);

  const notifications = [];
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // e.g. "2026-11-12"
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const weekEnd = todayStart + 7 * 24 * 60 * 60 * 1000;

  for (const title of titles) {
    const next = title.nextEpisodeToAir;
    const dateStr = next?.airDate || title.releaseDate;
    if (!dateStr) continue;

    const dateOnly = String(dateStr).split("T")[0];
    const airTime = new Date(`${dateOnly}T12:00:00Z`).getTime();
    if (!Number.isFinite(airTime)) continue;

    // Episode or movie badge
    const epCode = next?.seasonNumber && next?.episodeNumber
      ? `S${next.seasonNumber} E${next.episodeNumber}`
      : next?.episodeNumber
      ? `EP ${next.episodeNumber}`
      : title.episodeBadge || null;

    const id = `notif_ep_${title.id}_${dateOnly}_${epCode || "release"}`;
    if (dismissedSet.has(id)) continue;

    // Check if airing today, this week, or earlier
    const isToday = dateOnly === todayStr || (airTime >= todayStart && airTime <= todayEnd);
    const isFutureThisWeek = airTime > todayEnd && airTime <= weekEnd;
    const isPast = airTime < todayStart;

    // If past, only keep if recent (within 48 hours) and unread, else skip
    if (isPast && (now.getTime() - airTime > 48 * 3600 * 1000 || readSet.has(id))) {
      continue;
    }

    const formattedDate = new Date(`${dateOnly}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });

    let subtitle = "";
    if (isToday) {
      subtitle = epCode ? `Airing Today · ${epCode}` : `Airing Today · New Release`;
    } else if (isFutureThisWeek) {
      subtitle = epCode ? `Airs ${formattedDate} · ${epCode}` : `Releases ${formattedDate}`;
    } else {
      subtitle = epCode ? `Aired ${formattedDate} · ${epCode}` : `Released ${formattedDate}`;
    }

    notifications.push({
      id,
      title: title.title || title.name || "Untitled",
      subtitle,
      poster: title.poster,
      href: `/title/${title.id}`,
      section: isToday ? "today" : "this_week",
      unread: !readSet.has(id),
      type: title.type === "movie" ? "movie" : "episode",
      airTime,
      dateOnly,
      network: title.network || title.service || null,
    });
  }

  // Sort: today first, then closest air date
  notifications.sort((a, b) => {
    if (a.section === "today" && b.section !== "today") return -1;
    if (b.section === "today" && a.section !== "today") return 1;
    return a.airTime - b.airTime;
  });

  const today = notifications.filter((n) => n.section === "today");
  const thisWeek = notifications.filter((n) => n.section === "this_week");
  const unreadCount = notifications.filter((n) => n.unread).length;

  return { all: notifications, today, thisWeek, unreadCount };
}
