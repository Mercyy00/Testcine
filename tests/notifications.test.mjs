import test from "node:test";
import assert from "node:assert/strict";
import { buildDynamicNotifications } from "../lib/notifications.js";

test("buildDynamicNotifications correctly detects episode airing Today from schedule", () => {
  const todayStr = new Date().toISOString().split("T")[0];
  const schedule = [
    {
      id: "tv-svu",
      title: "Law & Order: Special Victims Unit",
      poster: "/test-poster.jpg",
      nextEpisodeToAir: {
        airDate: todayStr,
        seasonNumber: 26,
        episodeNumber: 7,
      },
      airDay: "Thu",
      type: "series",
      network: "NBC",
    },
  ];

  const result = buildDynamicNotifications({ schedule, readIds: [], dismissedIds: [] });

  assert.equal(result.all.length, 1);
  assert.equal(result.today.length, 1);
  assert.equal(result.unreadCount, 1);

  const notif = result.today[0];
  assert.equal(notif.title, "Law & Order: Special Victims Unit");
  assert.equal(notif.unread, true);
  assert.match(notif.subtitle, /Airing Today · S26 E7/);
});

test("buildDynamicNotifications handles read status and unread counter reduction", () => {
  const todayStr = new Date().toISOString().split("T")[0];
  const schedule = [
    {
      id: "tv-svu",
      title: "Law & Order: Special Victims Unit",
      nextEpisodeToAir: {
        airDate: todayStr,
        seasonNumber: 26,
        episodeNumber: 7,
      },
    },
  ];

  const initial = buildDynamicNotifications({ schedule });
  assert.equal(initial.unreadCount, 1);
  const notifId = initial.today[0].id;

  // After reading
  const afterRead = buildDynamicNotifications({
    schedule,
    readIds: [notifId],
  });
  assert.equal(afterRead.all.length, 1);
  assert.equal(afterRead.today[0].unread, false);
  assert.equal(afterRead.unreadCount, 0);
});

test("buildDynamicNotifications respects dismiss/skip and removes item from notifications", () => {
  const todayStr = new Date().toISOString().split("T")[0];
  const schedule = [
    {
      id: "tv-svu",
      title: "Law & Order: Special Victims Unit",
      nextEpisodeToAir: {
        airDate: todayStr,
        seasonNumber: 26,
        episodeNumber: 7,
      },
    },
  ];

  const initial = buildDynamicNotifications({ schedule });
  const notifId = initial.today[0].id;

  // Dismiss / skip notification
  const afterDismiss = buildDynamicNotifications({
    schedule,
    dismissedIds: [notifId],
  });

  assert.equal(afterDismiss.all.length, 0);
  assert.equal(afterDismiss.today.length, 0);
  assert.equal(afterDismiss.unreadCount, 0);
});

test("buildDynamicNotifications groups episodes airing later this week into thisWeek", () => {
  const future = new Date();
  future.setDate(future.getDate() + 3);
  const futureStr = future.toISOString().split("T")[0];

  const schedule = [
    {
      id: "anime-dan",
      title: "DAN DA DAN",
      nextEpisodeToAir: {
        airDate: futureStr,
        episodeNumber: 7,
      },
      type: "anime",
      network: "Crunchyroll",
    },
  ];

  const result = buildDynamicNotifications({ schedule });
  assert.equal(result.today.length, 0);
  assert.equal(result.thisWeek.length, 1);
  assert.equal(result.unreadCount, 1);
  assert.match(result.thisWeek[0].subtitle, /Airs .* · EP 7/);
});

test("buildDynamicNotifications excludes episodes that aired >48h ago if already read", () => {
  const past = new Date();
  past.setDate(past.getDate() - 3); // 3 days ago
  const pastStr = past.toISOString().split("T")[0];

  const schedule = [
    {
      id: "old-show",
      title: "Old Show",
      nextEpisodeToAir: {
        airDate: pastStr,
        seasonNumber: 1,
        episodeNumber: 1,
      },
    },
  ];

  const notifId = `notif_ep_old-show_${pastStr}_S1 E1`;
  const result = buildDynamicNotifications({
    schedule,
    readIds: [notifId],
  });

  assert.equal(result.all.length, 0);
  assert.equal(result.unreadCount, 0);
});

test("buildDynamicNotifications generates new release notifications when includeCurated is true", () => {
  const result = buildDynamicNotifications({ includeCurated: true });
  assert.ok(result.all.length > 0);
  const releaseNotifs = result.all.filter((n) => n.type === "release");
  assert.ok(releaseNotifs.length > 0);
  assert.equal(releaseNotifs[0].badge, "New Release");
  assert.ok(releaseNotifs.some((n) => n.title.includes("Ramayana") || n.title.includes("Resident Evil")));
});

test("buildDynamicNotifications generates personalized 'Because you watched' recommendations from history", () => {
  const history = [
    {
      id: "ramayana-rise-of-a-legend",
      title: "Ramayana: Rise of a Legend",
      type: "movie",
    },
  ];

  const result = buildDynamicNotifications({
    history,
    includeRecommendations: true,
  });

  const recNotifs = result.all.filter((n) => n.type === "recommendation");
  assert.ok(recNotifs.length > 0);
  assert.equal(recNotifs[0].badge, "For You");
  assert.match(recNotifs[0].subtitle, /Because you watched Ramayana: Rise of a Legend/);
  // Ensure the recommended item itself is not the already-watched title
  assert.notEqual(recNotifs[0].id, "notif_rec_ramayana-rise-of-a-legend_ramayana-rise-of-a-legend");
});

test("buildDynamicNotifications supports custom live new releases and recommendations", () => {
  const customReleases = [
    {
      id: "superman-legacy",
      title: "Superman: Legacy",
      poster: "/superman.jpg",
      subtitle: "Now Streaming in 4K UHD",
      badge: "Blockbuster",
      type: "release",
      href: "/title/superman-legacy",
    },
  ];

  const result = buildDynamicNotifications({
    newReleases: customReleases,
    includeNewReleases: true,
  });

  const superman = result.all.find((n) => n.id === "notif_rel_superman-legacy");
  assert.ok(superman);
  assert.equal(superman.title, "Superman: Legacy");
  assert.equal(superman.badge, "Blockbuster");
  assert.equal(superman.href, "/title/superman-legacy");
});
