import { getTitle } from "./data";

// Specific recommendation pairings based on user watch patterns
const MOVIE_RECOMMENDATIONS = {
  "avengers-endgame": {
    targetId: "guardians-of-the-galaxy-vol-2",
    reason: "Because you watched Avengers: Endgame",
  },
  "natsamrat": {
    targetId: "hamlet",
    reason: "Because you watched Natsamrat",
  },
  "spider-man-brand-new-day": {
    targetId: "spider-man-across-the-spider-verse",
    reason: "Because you watched Spider-Man: Brand New Day",
  },
  "heart-of-the-beast": {
    targetId: "the-mongoose",
    reason: "Because you watched Heart of the Beast",
  },
  "dune-part-two": {
    targetId: "interstellar",
    reason: "Because you watched Dune: Part Two",
  },
  "oppenheimer": {
    targetId: "interstellar",
    reason: "Because you watched Oppenheimer",
  },
};

// Series episodic notifications
const SERIES_EPISODES = {
  "visionquest": [
    {
      id: "vq_upcoming_s1e8",
      subtitle: "Upcoming · S1 E8 - Nov 10",
      section: "today",
      href: "/title/visionquest",
      date: "Nov 10",
    },
    {
      id: "vq_new_s1e7",
      subtitle: "New episode · S1 E7 - Immolation",
      section: "this_week",
      href: "/watch/visionquest",
      date: "Nov 3",
    },
  ],
  "black-doves": [
    {
      id: "bd_new_ep",
      subtitle: "New episode · S1 E6 - Bloodlines",
      section: "today",
      href: "/watch/black-doves",
      date: "Nov 5",
    },
  ],
  "arcane": [
    {
      id: "arcane_new_ep",
      subtitle: "New episode · S2 E6 - The Beast Beneath",
      section: "this_week",
      href: "/watch/arcane",
      date: "Nov 2",
    },
  ],
};

// New movie & series releases matching user preferred genres (Action, Drama, Comedy, Sci-Fi)
const NEW_RELEASES = [
  {
    targetId: "overacting",
    subtitle: "New movie · Nov 4",
    section: "this_week",
    date: "Nov 4",
  },
  {
    targetId: "godzilla-minus-zero",
    subtitle: "New movie · Nov 3",
    section: "this_week",
    date: "Nov 3",
  },
];

/**
 * Builds the notification list dynamically from the user's watch history and preferences.
 * Automatically adapts when the user watches new titles or removes items.
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

  const combinedWatched = Array.from(new Set([...historyIds, ...watchlistIds]));

  const notifications = [];

  // 1. Series Episodic Alerts (e.g. VisionQuest upcoming & new episodes)
  for (const watchedId of combinedWatched) {
    const episodes = SERIES_EPISODES[watchedId];
    if (episodes && episodes.length > 0) {
      const titleObj = getTitle(watchedId);
      if (titleObj) {
        for (const ep of episodes) {
          const notifId = `notif_ep_${watchedId}_${ep.id}`;
          if (!dismissedSet.has(notifId)) {
            notifications.push({
              id: notifId,
              title: titleObj.title,
              subtitle: ep.subtitle,
              poster: titleObj.poster,
              href: ep.href || `/title/${titleObj.id}`,
              section: ep.section, // "today" | "this_week"
              unread: !readSet.has(notifId),
              type: "episode",
            });
          }
        }
      }
    }
  }

  // 2. Watch-History Recommendations ("Because you watched...")
  for (const watchedId of historyIds) {
    const pair = MOVIE_RECOMMENDATIONS[watchedId];
    if (pair) {
      const targetObj = getTitle(pair.targetId);
      const watchedObj = getTitle(watchedId);
      if (targetObj && watchedObj) {
        const notifId = `notif_rec_${watchedId}_${pair.targetId}`;
        if (!dismissedSet.has(notifId)) {
          notifications.push({
            id: notifId,
            title: targetObj.title,
            subtitle: pair.reason,
            poster: targetObj.poster,
            href: `/title/${targetObj.id}`,
            section: "this_week",
            unread: !readSet.has(notifId),
            type: "recommendation",
          });
        }
      }
    }
  }

  // 3. New Releases in User's Preferred Genres
  for (const rel of NEW_RELEASES) {
    const targetObj = getTitle(rel.targetId);
    if (targetObj) {
      const notifId = `notif_new_${rel.targetId}`;
      if (!dismissedSet.has(notifId)) {
        notifications.push({
          id: notifId,
          title: targetObj.title,
          subtitle: rel.subtitle,
          poster: targetObj.poster,
          href: `/title/${targetObj.id}`,
          section: rel.section || "this_week",
          unread: !readSet.has(notifId),
          type: "new_release",
        });
      }
    }
  }

  // Separate into Today and This week
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
