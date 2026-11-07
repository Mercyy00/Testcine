// Lightweight curated notification title candidates
// Zero JSON weight - prevents bundling 2.5 MB of catalogue data into global client chunks
const NOTIFICATION_SEEDS = [
  {
    id: "ramayana-rise-of-a-legend",
    title: "Ramayana: The Legend of Prince Rama",
    type: "movie",
    genres: ["Animation", "Action"],
    poster: "https://image.tmdb.org/t/p/w500/yHVZncPRZr63mezRX20IyKLrSkv.jpg",
  },
  {
    id: "visionquest",
    title: "VisionQuest",
    type: "series",
    genres: ["Action", "Sci-Fi & Fantasy"],
    poster: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    badge: "E4 in 2d",
  },
  {
    id: "heart-of-the-beast",
    title: "Heart of the Beast",
    type: "movie",
    genres: ["Action", "Thriller"],
    poster: "https://image.tmdb.org/t/p/w500/xsMGmNELfdLQrzbCcgaGgbBYv7B.png",
  },
  {
    id: "spider-man-brand-new-day",
    title: "Spider-Man: Brand New Day",
    type: "movie",
    genres: ["Action", "Adventure"],
    poster: "https://image.tmdb.org/t/p/w500/hz2Hv8tPToHvQ7HaxzqeLvahmcJ.jpg",
  },
  {
    id: "arcane",
    title: "Arcane",
    type: "series",
    genres: ["Animation", "Sci-Fi & Fantasy"],
    poster: "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn39RJJ33PCmm.jpg",
  },
  {
    id: "demon-slayer",
    title: "Demon Slayer: Kimetsu no Yaiba",
    type: "anime",
    genres: ["Animation", "Action"],
    poster: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    badge: "E8 in 3d",
  },
];

const seedMap = new Map(NOTIFICATION_SEEDS.map((s) => [s.id, s]));

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

  const historyIds = (history || [])
    .map((h) => (typeof h === "string" ? h : h?.id))
    .filter(Boolean);
  const watchlistIds = (watchlist || [])
    .map((w) => (typeof w === "string" ? w : w?.id))
    .filter(Boolean);
  const userKnownIds = new Set([...historyIds, ...watchlistIds]);

  const notifications = [];

  // Helper to resolve title metadata from item object or seedMap
  const resolveTitle = (id) => {
    if (!id) return null;
    if (typeof id === "object" && id.title) return id;
    const str = String(id).toLowerCase();
    return seedMap.get(str) || null;
  };

  // 1. Dynamic Episodic & Airing Alerts for items in user watchlist / history
  for (const id of userKnownIds) {
    const titleObj = resolveTitle(id);
    if (!titleObj) continue;

    // Check if title is a series with next episode info or upcoming episodes
    if (titleObj.type === "series" || titleObj.type === "anime") {
      if (titleObj.nextEpisodeToAir) {
        const next = titleObj.nextEpisodeToAir;
        const airTime = next.airDate ? new Date(next.airDate).getTime() : NaN;
        const isFuture = !Number.isNaN(airTime) && airTime > Date.now();
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
    const t = resolveTitle(watchedId);
    if (t?.genres) {
      t.genres.forEach((g) => userGenres.add(g));
    }
  }

  if (historyIds.length > 0) {
    const lastWatched = resolveTitle(historyIds[0]);
    if (lastWatched) {
      const candidate = NOTIFICATION_SEEDS.find(
        (cand) =>
          cand.id !== lastWatched.id &&
          !userKnownIds.has(cand.id) &&
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
  const recentReleases = NOTIFICATION_SEEDS.filter(
    (t) => !userKnownIds.has(t.id)
  ).slice(0, 2);

  for (const rel of recentReleases) {
    const notifId = `notif_rel_${rel.id}`;
    if (!dismissedSet.has(notifId)) {
      notifications.push({
        id: notifId,
        title: rel.title,
        subtitle: `Trending now · ${rel.genres?.slice(0, 2).join(", ") || "Popular"}`,
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
