import { getTitle, TITLES } from "./data";

/**
 * Builds the notification list dynamically from the user's watch history and preferences.
 * Automatically adapts when the user watches new titles or saves items to their watchlist.
 */
export function buildDynamicNotifications({
  history = [],
  watchlist = [],
  readIds = [],
  dismissedIds = [],
}) {
  const dismissedSet = new Set(dismissedIds || []);
  const readSet = new Set(readIds || []);

  const historyIds = (history || []).map((h) => (typeof h === "string" ? h : h.id)).filter(Boolean);
  const watchlistIds = (watchlist || []).map((w) => (typeof w === "string" ? w : w.id)).filter(Boolean);
  const userKnownIds = new Set([...historyIds, ...watchlistIds]);

  const notifications = [];
  const now = Date.now();

  // 1. Dynamic Episodic & Airing Alerts for items in user watchlist / history
  for (const id of userKnownIds) {
    const titleObj = getTitle(id);
    if (!titleObj) continue;

    // Check if title is a series with next episode info or upcoming episodes
    if (titleObj.type === "series" || titleObj.type === "anime") {
      if (titleObj.nextEpisodeToAir) {
        const next = titleObj.nextEpisodeToAir;
        const airTime = next.airDate ? new Date(next.airDate).getTime() : NaN;
        const isFuture = !Number.isNaN(airTime) && airTime > now;
        const notifId = `notif_ep_${titleObj.id}_s${next.seasonNumber || 1}e${next.episodeNumber || 1}`;

        if (!dismissedSet.has(notifId)) {
          const dateStr = next.airDate
            ? new Date(next.airDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "";
          notifications.push({
            id: notifId,
            title: titleObj.title,
            subtitle: isFuture
              ? `Upcoming · S${next.seasonNumber || 1} E${next.episodeNumber || 1}${dateStr ? ` - ${dateStr}` : ""}`
              : `New episode · S${next.seasonNumber || 1} E${next.episodeNumber || 1}${next.name ? ` - ${next.name}` : ""}`,
            poster: titleObj.poster,
            href: isFuture ? `/title/${titleObj.id}` : `/watch/${titleObj.id}`,
            section: isFuture ? "today" : "this_week",
            unread: !readSet.has(notifId),
            type: "episode",
          });
        }
      } else if (titleObj.status === "airing" || titleObj.badge?.includes("E")) {
        const notifId = `notif_airing_${titleObj.id}`;
        if (!dismissedSet.has(notifId)) {
          notifications.push({
            id: notifId,
            title: titleObj.title,
            subtitle: `New episode available · ${titleObj.badge || "Airing now"}`,
            poster: titleObj.poster,
            href: `/watch/${titleObj.id}`,
            section: "today",
            unread: !readSet.has(notifId),
            type: "episode",
          });
        }
      }
    }
  }

  // 2. Dynamic Genre-based Recommendations based on actual watch history
  const userGenres = new Set();
  for (const watchedId of historyIds) {
    const t = getTitle(watchedId);
    if (t?.genres) {
      t.genres.forEach((g) => userGenres.add(g));
    }
  }

  if (historyIds.length > 0) {
    const lastWatched = getTitle(historyIds[0]);
    if (lastWatched) {
      // Find candidate titles matching genres of last watched, excluding known items
      const candidate = (TITLES || []).find(
        (cand) =>
          cand.id !== lastWatched.id &&
          !userKnownIds.has(cand.id) &&
          cand.status !== "upcoming" &&
          cand.genres?.some((g) => lastWatched.genres?.includes(g))
      );

      if (candidate) {
        const notifId = `notif_rec_${lastWatched.id}_${candidate.id}`;
        if (!dismissedSet.has(notifId)) {
          notifications.push({
            id: notifId,
            title: candidate.title,
            subtitle: `Because you watched ${lastWatched.title}`,
            poster: candidate.poster,
            href: `/title/${candidate.id}`,
            section: "this_week",
            unread: !readSet.has(notifId),
            type: "recommendation",
          });
        }
      }
    }
  }

  // 3. Dynamic Fresh & Upcoming Releases
  const recentReleases = (TITLES || [])
    .filter((t) => !userKnownIds.has(t.id) && (t.status === "released" || t.status === "upcoming"))
    .slice(0, 2);

  for (const rel of recentReleases) {
    const notifId = `notif_rel_${rel.id}`;
    if (!dismissedSet.has(notifId)) {
      const isUp = rel.status === "upcoming";
      notifications.push({
        id: notifId,
        title: rel.title,
        subtitle: isUp
          ? `Coming soon · ${rel.type === "movie" ? "Movie" : "Series"}`
          : `Trending now · ${rel.genres?.slice(0, 2).join(", ") || "Popular"}`,
        poster: rel.poster,
        href: `/title/${rel.id}`,
        section: "this_week",
        unread: !readSet.has(notifId),
        type: "new_release",
      });
    }
  }

  const today = notifications.filter((n) => n.section === "today");
  const thisWeek = notifications.filter((n) => n.section === "this_week");
  const unreadCount = notifications.filter((n) => n.unread).length;

  return {
    all: notifications,
    today,
    thisWeek,
    unreadCount,
  };
}
