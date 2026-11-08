// Pure functions for merging client and server user state

export const DEVICE_SPECIFIC_SETTINGS = new Set([
  "volume",
  "device",
  "deviceLabel",
  "tmdbKey",
]);

export function cleanSettingsForSync(settings = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!DEVICE_SPECIFIC_SETTINGS.has(key)) {
      clean[key] = value;
    }
  }
  return clean;
}

export const keyOfHistory = (e) => `${e?.id}:${e?.season || 0}:${e?.episode || 0}`;

export function mergeHistory(serverHistory = [], localHistory = []) {
  const map = new Map();
  [...serverHistory, ...localHistory].forEach((item) => {
    if (!item?.id) return;
    const k = keyOfHistory(item);
    const existing = map.get(k);
    if (!existing || (item.at || 0) > (existing.at || 0)) {
      map.set(k, item);
    }
  });
  return [...map.values()]
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, 60);
}

export function mergeWatchlist(serverWatchlist = [], localWatchlist = []) {
  const seen = new Set();
  const merged = [];
  [...localWatchlist, ...serverWatchlist].forEach((item) => {
    const id = typeof item === "string" ? item : item?.id;
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push(item);
  });
  return merged;
}

export function mergeUserData(server = {}, local = {}) {
  const mergedHistory = mergeHistory(server.history || [], local.history || []);
  const mergedWatchlist = mergeWatchlist(server.watchlist || [], local.list || []);

  const serverExtras = server.extras || {};
  const mergedReactions = { ...(serverExtras.reactions || {}), ...(local.reactions || {}) };
  const mergedRatings = { ...(serverExtras.ratings || {}), ...(local.ratings || {}) };
  const mergedWatched = { ...(serverExtras.watched || {}), ...(local.watched || {}) };

  const customListIds = new Set((local.customLists || []).map((c) => c.id));
  const mergedCustomLists = [
    ...(local.customLists || []),
    ...((serverExtras.customLists || []).filter((c) => !customListIds.has(c.id))),
  ];

  const safeServerSettings = cleanSettingsForSync(serverExtras.settings || {});
  const safeLocalSettings = cleanSettingsForSync(local.settings || {});
  const mergedSettings = {
    ...safeServerSettings,
    ...safeLocalSettings,
  };

  return {
    schemaVersion: 1,
    history: mergedHistory,
    watchlist: mergedWatchlist,
    extras: {
      settings: mergedSettings,
      reactions: mergedReactions,
      ratings: mergedRatings,
      watched: mergedWatched,
      customLists: mergedCustomLists,
    },
  };
}
