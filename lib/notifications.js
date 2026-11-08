/**
 * Build episode alerts only from real episode metadata stored with a user's
 * history or watchlist. Recommendations and release notices need a real
 * source before they can be shown as notifications.
 */
export function buildDynamicNotifications({
  history = [],
  watchlist = [],
  readIds = [],
  dismissedIds = [],
}) {
  const readSet = new Set(readIds || []);
  const dismissedSet = new Set(dismissedIds || []);
  const entries = [...(history || []), ...(watchlist || [])];
  const titles = entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      if (entry.title && typeof entry.title === "object") return entry.title;
      return typeof entry.title === "string" ? entry : null;
    })
    .filter((title, index, list) => title?.id && list.findIndex((item) => item?.id === title.id) === index);

  const notifications = [];
  const now = Date.now();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  for (const title of titles) {
    const next = title.nextEpisodeToAir;
    if (!next?.airDate) continue;

    const airTime = new Date(next.airDate).getTime();
    if (!Number.isFinite(airTime) || airTime <= now) continue;

    const id = `notif_ep_${title.id}_s${next.seasonNumber || 1}e${next.episodeNumber || 1}`;
    if (dismissedSet.has(id)) continue;

    const date = new Date(next.airDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    notifications.push({
      id,
      title: title.title,
      subtitle: `Upcoming · S${next.seasonNumber || 1} E${next.episodeNumber || 1}${date ? ` - ${date}` : ""}`,
      poster: title.poster,
      href: `/title/${title.id}`,
      section: airTime <= todayEnd.getTime() ? "today" : "this_week",
      unread: !readSet.has(id),
      type: "episode",
    });
  }

  const today = notifications.filter((notification) => notification.section === "today");
  const thisWeek = notifications.filter((notification) => notification.section === "this_week");
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  return { all: notifications, today, thisWeek, unreadCount };
}
