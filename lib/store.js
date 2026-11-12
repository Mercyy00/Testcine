import { PROFILE_AVATARS, DEFAULT_AVATAR } from "./avatars.js";
import { useSyncExternalStore, useCallback, useEffect } from "react";

// Tiny localStorage-backed store. Safe on the server and when storage is blocked.
const listeners = new Set();
const cache = new Map();

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  if (cache.has(key)) return cache.get(key);
  let value = fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) value = JSON.parse(raw);
  } catch {}
  cache.set(key, value);
  return value;
}

function write(key, value) {
  cache.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  const onStorage = (e) => {
    if (e.key && e.key.startsWith("viv:")) {
      cache.delete(e.key);
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStored(key, fallback) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback
  );
  const set = useCallback(
    (next) => write(key, typeof next === "function" ? next(read(key, fallback)) : next),
    [key, fallback]
  );
  return [value, set];
}

const EMPTY_LIST = [];
const EMPTY_OBJ = {};

export const DEFAULT_HISTORY = [];

export const DEFAULT_WATCHLIST = [];

export const DEFAULT_REACTIONS = {};

export const SETTINGS_SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS = {
  _version: SETTINGS_SCHEMA_VERSION,
  // 1. Account
  name: "Guest",
  email: "guest@divine.internal",
  avatar: "",
  signedIn: false,
  publicProfile: false,
  showWatchHistory: false,
  passwordSet: false,
  googleLinked: false,
  historyHidden: false,

  // 2. Integrations
  simklConnected: false,
  traktConnected: false,
  anilistConnected: false,
  malConnected: false,

  // 3. Player
  preferredQuality: "Auto",
  preferredAudio: "Original",
  skipInterval: "10s",
  autoplayNext: true,
  pauseScreen: true,
  skipIntros: false,
  skipCredits: false,
  skipFiller: false,
  resumePlayback: true,
  rememberLastSource: false,
  dataSaver: false,

  // 4. Appearance
  theme: "dark",
  showBackground: true,
  bgIntensity: 85,
  ambientLight: "art", // "art" | "live" | "off"
  autoplayPreviews: true,
  bannerTrailersOnHover: false,

  // 5. Content
  region: "United States",
  adultContent: false,
  hideWatched: false,
  hideSpoilers: false,
  incognito: false,
};

export const DEFAULT_CUSTOM_LISTS = [];

export function useHistory() {
  const [history, setHistory] = useStored("viv:history", DEFAULT_HISTORY);

  useEffect(() => {
    if (!Array.isArray(history)) {
      setHistory(DEFAULT_HISTORY);
      return;
    }

    // Old title-card clicks added fabricated 15% progress. Playback records
    // carry a timeLeft value, so keep those and discard the synthetic rows.
    const actualHistory = history.filter(
      (entry) => !(entry?.progress === 0.15 && !entry.timeLeft && !entry.secondsLeft)
    );
    if (actualHistory.length !== history.length) setHistory(actualHistory);
  }, [history, setHistory]);

  return [history, setHistory];
} // [{id, title: {…card}, progress, at, timeLeft}]
export const useList = () => useStored("viv:list", DEFAULT_WATCHLIST); // [id | {id, title: {…card}}]
export const useSearches = () => useStored("viv:searches", EMPTY_LIST); // [string]
export const DEFAULT_WATCH_LOG = [];
export const useWatchLog = () => useStored("viv:watch_log", DEFAULT_WATCH_LOG);
export { recordWatchDelta, migrateHistoryToWatchLog } from "./profileStats.js";
function readSettings() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const key = "viv:settings";
  if (cache.has(key)) return cache.get(key);
  let value = DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Clean up legacy leaked keys or personal identities
      delete parsed.tmdbKey;
      delete parsed.febboxCookie;
      if (parsed.name === "Jayesh") parsed.name = "Guest";
      if (parsed.email === "godlikejayesh@gmail.com") parsed.email = "guest@divine.internal";
      value = { ...DEFAULT_SETTINGS, ...parsed, _version: SETTINGS_SCHEMA_VERSION };
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }
  } catch {}
  cache.set(key, value);
  return value;
}

export const useSettings = () => {
  const value = useSyncExternalStore(
    subscribe,
    readSettings,
    () => DEFAULT_SETTINGS
  );
  const set = useCallback(
    (next) => write("viv:settings", typeof next === "function" ? next(readSettings()) : { ...DEFAULT_SETTINGS, ...next }),
    []
  );
  return [value, set];
};
export const useCustomLists = () => useStored("viv:custom_lists", DEFAULT_CUSTOM_LISTS); // [{id, name, items: [id]}]
export const useReactions = () => useStored("viv:reactions", DEFAULT_REACTIONS); // {[titleId]: 'dislike' | 'like' | 'love'}
export const useWatchedEpisodes = () => useStored("viv:watched_episodes", EMPTY_OBJ); // {[titleId]: [number]}
export const useUserRatings = () => useStored("viv:user_ratings", EMPTY_OBJ); // {[titleId]: number (1-10)}
export const useSchedule = () => useStored("viv:schedule", EMPTY_LIST); // [id]
export const useReadNotifications = () => useStored("viv:notifications_read", EMPTY_LIST);
export const useDismissedNotifications = () => useStored("viv:notifications_dismissed", EMPTY_LIST);

export function toggleScheduleItem(setSchedule, titleId, titleData = null) {
  setSchedule((prev) => {
    const list = prev || [];
    const id = typeof titleId === "object" ? titleId?.id : titleId;
    const exists = list.some((item) => (typeof item === "object" ? item.id : item) === id);
    if (exists) {
      return list.filter((item) => (typeof item === "object" ? item.id : item) !== id);
    }
    const entry = titleData || (typeof titleId === "object" ? titleId : { id: titleId });
    return [...list, entry];
  });
}

export function setUserRating(setRatings, titleId, score) {
  setRatings((prev) => ({
    ...(prev || {}),
    [titleId]: score,
  }));
}

export function toggleWatchedEpisode(setWatched, titleId, epKey, altKey = null) {
  setWatched((prev) => {
    const list = prev?.[titleId] || [];
    const matches = (item) =>
      String(item) === String(epKey) ||
      (typeof epKey === "number" && Number(item) === epKey) ||
      (altKey && (String(item) === String(altKey) || Number(item) === Number(altKey)));

    const exists = list.some(matches);
    const updated = exists ? list.filter((item) => !matches(item)) : [...list, epKey];
    return {
      ...(prev || {}),
      [titleId]: updated,
    };
  });
}

export function toggleCustomListItem(setCustomLists, listId, titleId) {
  setCustomLists((lists) =>
    (lists || []).map((l) => {
      if (l.id !== listId) return l;
      const items = l.items || [];
      const exists = items.includes(titleId);
      return {
        ...l,
        items: exists ? items.filter((id) => id !== titleId) : [...items, titleId],
      };
    })
  );
}

export function createCustomList(setCustomLists, name, initialTitleId) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const id = `list_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newList = {
    id,
    name: trimmed,
    items: initialTitleId ? [initialTitleId] : [],
    createdAt: Date.now(),
  };
  setCustomLists((lists) => [...(lists || []), newList]);
  return newList;
}

export function deleteCustomList(setCustomLists, listId) {
  setCustomLists((lists) => (lists || []).filter((l) => l.id !== listId));
}

export const DEFAULT_PROFILES = [
  {
    id: "guest",
    name: "Guest",
    avatar: DEFAULT_AVATAR,
    isKids: false,
  },
];

export { PROFILE_AVATARS };

export const useProfiles = () => useStored("viv:profiles", DEFAULT_PROFILES);
export const useActiveProfileId = () => useStored("viv:active_profile_id", "guest");

export function switchProfile(setActiveId, setSettings, profile) {
  setActiveId(profile.id);
  setSettings((s) => ({
    ...s,
    name: profile.name,
    avatar: profile.avatar,
    activeProfileId: profile.id,
    isKids: Boolean(profile.isKids),
    adultContent: profile.isKids ? false : s.adultContent,
  }));
}

export function addProfile(setProfiles, name, avatar, isKids = false) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const id = `prof_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newProf = {
    id,
    name: trimmed,
    avatar: avatar || PROFILE_AVATARS[0].url,
    isKids,
  };
  setProfiles((prev) => [...(prev || DEFAULT_PROFILES), newProf]);
  return newProf;
}

export function updateProfile(setProfiles, profileId, updates) {
  setProfiles((prev) =>
    (prev || DEFAULT_PROFILES).map((p) => (p.id === profileId ? { ...p, ...updates } : p))
  );
}

export function deleteProfile(setProfiles, profileId) {
  setProfiles((prev) => {
    const current = prev || DEFAULT_PROFILES;
    const filtered = current.filter((p) => p.id !== profileId);
    return filtered.length > 0 ? filtered : DEFAULT_PROFILES;
  });
}

export function removeFromHistory(setHistory, id) {
  setHistory((h) => (h || []).filter((x) => x.id !== id));
}

// ---------- Card snapshot helpers ----------
// Watchlist and history persist a compact card snapshot alongside the id so
// titles discovered live from TMDB keep rendering after the visit that added
// them. Plain-string entries from older versions still resolve via page-level
// cardMap props, so nothing needs migrating.

// Fields that make a card render standalone. Dropped from snapshots before
// saving to keep localStorage small.
const SNAPSHOT_KEEP = [
  "id", "tmdbId", "title", "type", "year", "rating", "runtime", "poster", "backdrop",
  "logo", "genres", "quality", "badge", "cert", "service", "studio", "nextEpisodeToAir",
];

export function toSnapshot(input) {
  if (!input || typeof input !== "object") return null;
  const card = {};
  for (const key of SNAPSHOT_KEEP) {
    if (input[key] !== undefined && input[key] !== null) card[key] = input[key];
  }
  if (!card.id) return null;
  return card;
}

// Resolve a stored entry (plain id, {id, title} or legacy object shapes) back
// to a renderable card, preferring the stored snapshot.
export function entryCard(entry) {
  if (!entry) return null;
  if (typeof entry === "object") {
    if (entry.title && typeof entry.title === "object") return entry.title;
    if (entry.title || entry.poster) return entry; // legacy embedded-object shape
    return null;
  }
  return null; // plain string id: caller falls back to cardMap
}

export function entryId(entry) {
  if (entry === null || entry === undefined) return null;
  return typeof entry === "object" ? entry.id : entry;
}

// Membership test that works for both legacy string entries and {id, title}
// snapshot entries.
export function inList(list, id) {
  return (list || []).some((e) => entryId(e) === id);
}

// Toggle a watchlist entry, storing a card snapshot so live-discovered titles
// keep rendering later. Existing legacy entries keep their position.
export function toggleListEntry(setList, id, card) {
  const snapshot = toSnapshot(card) || { id };
  setList((l) => {
    const list = l || [];
    return inList(list, id)
      ? list.filter((e) => entryId(e) !== id)
      : [{ id, title: snapshot }, ...list];
  });
}

export function clearCustomList(setCustomLists, listId) {
  setCustomLists((lists) =>
    (lists || []).map((l) => (l.id === listId ? { ...l, items: [] } : l))
  );
}
