/**
 * Build episode alerts, new release announcements, and personalized watch recommendations.
 * Supports:
 * - Airing Today releases (with unread badge counter)
 * - Upcoming releases This Week
 * - New Blockbuster & Cinema Releases ("Now Streaming", "New Release")
 * - Personalized Recommendations based on watch history ("Because you watched X...")
 * - In-app dismissal and read tracking ("if skipped then it moves accordingly")
 */

export const CURATED_NEW_RELEASES = [
  {
    id: "ramayana-rise-of-a-legend",
    title: "Ramayana: Rise of a Legend",
    poster: "https://image.tmdb.org/t/p/w500/hz2Hv8tPToHvQ7HaxzqeLvahmcJ.jpg",
    subtitle: "Now Streaming · New Blockbuster in 4K UHD",
    badge: "New Release",
    type: "release",
    href: "/watch/ramayana-rise-of-a-legend",
  },
  {
    id: "heart-of-the-beast",
    title: "Heart of the Beast",
    poster: "https://image.tmdb.org/t/p/w500/6sYemVUn79UPKz1ZsSG6kPU4RVy.jpg",
    subtitle: "Fresh Release · Action & Wilderness Thriller",
    badge: "New Release",
    type: "release",
    href: "/title/heart-of-the-beast",
  },
  {
    id: "resident-evil",
    title: "Resident Evil",
    poster: "https://image.tmdb.org/t/p/w500/gAgWJhUSQWCgtKR8170nMkYlBda.jpg",
    subtitle: "Now Streaming · Horror & Survival Action",
    badge: "New Release",
    type: "release",
    href: "/title/resident-evil",
  },
  {
    id: "spider-man-brand-new-day",
    title: "Spider-Man: Brand New Day",
    poster: "https://image.tmdb.org/t/p/w500/bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg",
    subtitle: "Trending #1 · Marvel Cinematic Universe",
    badge: "Trending",
    type: "release",
    href: "/title/spider-man-brand-new-day",
  },
];

const POPULAR_RECOMMENDATION_MAP = {
  "ramayana-rise-of-a-legend": [
    {
      id: "dune",
      title: "Dune: Part Two",
      poster: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
      reason: "Epic mythology & grand scale cinematic saga",
    },
    {
      id: "jack-the-giant-slayer",
      title: "Jack the Giant Slayer",
      poster: "https://image.tmdb.org/t/p/w500/9jSI7saUX9Qz0JLh19jX2ulEwL7.jpg",
      reason: "High fantasy & mythological battles",
    },
  ],
  "dune": [
    {
      id: "interstellar",
      title: "Interstellar",
      poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      reason: "Visually stunning sci-fi masterpiece",
    },
  ],
  "deadpool-wolverine": [
    {
      id: "spider-man-no-way-home",
      title: "Spider-Man: No Way Home",
      poster: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
      reason: "Multiverse superhero action & comedy",
    },
  ],
  "alien-romulus": [
    {
      id: "resident-evil",
      title: "Resident Evil",
      poster: "https://image.tmdb.org/t/p/w500/gAgWJhUSQWCgtKR8170nMkYlBda.jpg",
      reason: "Claustrophobic sci-fi horror thriller",
    },
  ],
};

export function buildDynamicNotifications({
  history = [],
  watchlist = [],
  schedule = [],
  readIds = [],
  dismissedIds = [],
  newReleases = [],
  recommendations = [],
  includeCurated = false,
  includeRecommendations = true,
  includeNewReleases = true,
}) {
  const readSet = new Set(readIds || []);
  const dismissedSet = new Set(dismissedIds || []);

  const notifications = [];
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // e.g. "2026-11-13"
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const weekEnd = todayStart + 7 * 24 * 60 * 60 * 1000;

  // 1. Personalized Recommendations based on watch history ("Because you watched X...")
  if (includeRecommendations && Array.isArray(history) && history.length > 0) {
    const watchedList = history.slice(0, 4);
    for (const watched of watchedList) {
      if (!watched) continue;
      const watchedId = String(watched.id || watched.tmdbId || "");
      const watchedTitle = watched.title || watched.name || "a title";

      const candidateRecs = [
        ...(Array.isArray(recommendations) ? recommendations : []),
        ...(Array.isArray(watched.recommendations) ? watched.recommendations : []),
        ...(POPULAR_RECOMMENDATION_MAP[watchedId] || []),
      ];

      // Smart fallback if no direct matches in map or API
      if (candidateRecs.length === 0) {
        const fallbackCandidates = [
          {
            id: "dune",
            title: "Dune: Part Two",
            poster: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
            reason: "Popular epic recommended for you",
          },
          {
            id: "ramayana-rise-of-a-legend",
            title: "Ramayana: Rise of a Legend",
            poster: "https://image.tmdb.org/t/p/w500/hz2Hv8tPToHvQ7HaxzqeLvahmcJ.jpg",
            reason: "Blockbuster cinematic spectacle",
          },
          {
            id: "resident-evil",
            title: "Resident Evil",
            poster: "https://image.tmdb.org/t/p/w500/gAgWJhUSQWCgtKR8170nMkYlBda.jpg",
            reason: "High octane survival action",
          },
          {
            id: "heart-of-the-beast",
            title: "Heart of the Beast",
            poster: "https://image.tmdb.org/t/p/w500/6sYemVUn79UPKz1ZsSG6kPU4RVy.jpg",
            reason: "Gripping thriller you might enjoy",
          },
        ];
        for (const fb of fallbackCandidates) {
          if (String(fb.id) !== watchedId && !history.some((h) => String(h.id || h.tmdbId) === String(fb.id))) {
            candidateRecs.push(fb);
            break;
          }
        }
      }

      for (const rec of candidateRecs) {
        if (!rec || !rec.id) continue;
        const recId = String(rec.id);
        // Do not recommend something the user has already watched in history
        if (history.some((h) => String(h.id || h.tmdbId) === recId)) continue;

        const notifId = `notif_rec_${watchedId}_${recId}`;
        if (dismissedSet.has(notifId)) continue;
        if (notifications.some((n) => n.id === notifId || n.href === `/title/${recId}` || n.href === `/watch/${recId}`)) continue;

        const matchReason = rec.reason ? ` · ${rec.reason}` : " · Recommended for you";
        notifications.push({
          id: notifId,
          title: rec.title || rec.name || "Recommended for you",
          subtitle: `Because you watched ${watchedTitle}${matchReason}`,
          poster: rec.poster || rec.poster_path || "/placeholder.png",
          href: `/title/${recId}`,
          section: "today",
          unread: !readSet.has(notifId),
          type: "recommendation",
          badge: "For You",
          airTime: now.getTime() - 1000,
          dateOnly: todayStr,
        });
        break; // 1 top recommendation per watched title to keep list focused
      }
    }
  }

  // 2. New Blockbuster Releases & Featured Drops
  if (includeNewReleases && (includeCurated || (Array.isArray(newReleases) && newReleases.length > 0))) {
    const releasesToUse = (Array.isArray(newReleases) && newReleases.length > 0)
      ? newReleases
      : CURATED_NEW_RELEASES;

    for (const item of releasesToUse.slice(0, 6)) {
      if (!item || !item.id) continue;
      const notifId = `notif_rel_${item.id}`;
      if (dismissedSet.has(notifId)) continue;
      if (notifications.some((n) => n.id === notifId || n.href === item.href || n.title === item.title)) continue;

      notifications.push({
        id: notifId,
        title: item.title || item.name || "New Release",
        subtitle: item.subtitle || "Now Streaming · New Release",
        poster: item.poster || item.poster_path || "/placeholder.png",
        href: item.href || `/title/${item.id}`,
        section: "today",
        unread: !readSet.has(notifId),
        type: "release",
        badge: item.badge || "New Release",
        airTime: now.getTime() - 5000,
        dateOnly: todayStr,
      });
    }
  }

  // 3. Airing Today & Upcoming Episode Releases from Schedule and Watchlist
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

  for (const title of titles) {
    const next = title.nextEpisodeToAir;
    const dateStr = next?.airDate || title.releaseDate;
    if (!dateStr) continue;

    const dateOnly = String(dateStr).split("T")[0];
    const airTime = new Date(`${dateOnly}T12:00:00Z`).getTime();
    if (!Number.isFinite(airTime)) continue;

    const epCode = next?.seasonNumber && next?.episodeNumber
      ? `S${next.seasonNumber} E${next.episodeNumber}`
      : next?.episodeNumber
      ? `EP ${next.episodeNumber}`
      : title.episodeBadge || null;

    const id = `notif_ep_${title.id}_${dateOnly}_${epCode || "release"}`;
    if (dismissedSet.has(id)) continue;

    const isToday = dateOnly === todayStr || (airTime >= todayStart && airTime <= todayEnd);
    const isFutureThisWeek = airTime > todayEnd && airTime <= weekEnd;
    const isPast = airTime < todayStart;

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
      badge: isToday ? "Airing Today" : "Upcoming",
      airTime,
      dateOnly,
      network: title.network || title.service || null,
    });
  }

  // Sort: today first, then unread first, then newest
  notifications.sort((a, b) => {
    if (a.section === "today" && b.section !== "today") return -1;
    if (b.section === "today" && a.section !== "today") return 1;
    if (a.unread && !b.unread) return -1;
    if (!a.unread && b.unread) return 1;
    return (b.airTime || 0) - (a.airTime || 0);
  });

  const today = notifications.filter((n) => n.section === "today");
  const thisWeek = notifications.filter((n) => n.section === "this_week");
  const unreadCount = notifications.filter((n) => n.unread).length;

  return { all: notifications, today, thisWeek, unreadCount };
}
