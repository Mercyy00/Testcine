import { useSyncExternalStore, useCallback } from "react";

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

export const DEFAULT_HISTORY = [
  { id: "avengers-endgame", progress: 0.85, at: 1730950000000, timeLeft: "18m left" },
  { id: "visionquest", progress: 0.45, at: 1730940000000, timeLeft: "24m left" },
  { id: "heart-of-the-beast", progress: 0.15, at: 1730860000000, timeLeft: "1h 45m left" },
  { id: "ramayana-rise-of-a-legend", progress: 0.20, at: 1730770000000, timeLeft: "1h 55m left" },
  { id: "spider-man-brand-new-day", progress: 0.35, at: 1730680000000, timeLeft: "1h 46m left" },
  { id: "natsamrat", progress: 0.10, at: 1730590000000, timeLeft: "2h 23m left" },
];

export const DEFAULT_WATCHLIST = ["visionquest"];

export const DEFAULT_REACTIONS = {
  "avengers-endgame": "like",
  "natsamrat": "like",
};

export const DEFAULT_SETTINGS = {
  // 1. Account
  name: "Jayesh",
  email: "godlikejayesh@gmail.com",
  avatar: "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
  signedIn: true,
  publicProfile: false,
  showWatchHistory: false,
  passwordSet: false,
  googleLinked: true,
  historyHidden: true,

  // 2. Integrations
  febboxCookie: "",
  simklConnected: false,
  traktConnected: false,
  anilistConnected: false,
  malConnected: false,

  // 3. Player
  preferredQuality: "Auto",
  preferredAudio: "Hindi",
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
  autoplayPreviews: true,
  bannerTrailersOnHover: false,

  // 5. Content
  region: "United States",
  adultContent: false,
  hideWatched: false,
  hideSpoilers: false,
  incognito: false,

  // TMDB Engine
  tmdbKey: "2dca580c2a14b55200e784d157207b4d",
};

export const DEFAULT_CUSTOM_LISTS = [
  {
    id: "marevel",
    name: "marevel",
    items: ["avengers-endgame", "spider-man-brand-new-day"],
    createdAt: Date.now(),
  },
];

export const useHistory = () => useStored("viv:history", DEFAULT_HISTORY); // [{id, progress, at, timeLeft}]
export const useList = () => useStored("viv:list", DEFAULT_WATCHLIST); // [id]
export const useSearches = () => useStored("viv:searches", EMPTY_LIST); // [string]
export const useSettings = () => useStored("viv:settings", DEFAULT_SETTINGS);
export const useCustomLists = () => useStored("viv:custom_lists", DEFAULT_CUSTOM_LISTS); // [{id, name, items: [id]}]
export const useReactions = () => useStored("viv:reactions", DEFAULT_REACTIONS); // {[titleId]: 'dislike' | 'like' | 'love'}
export const useWatchedEpisodes = () => useStored("viv:watched_episodes", EMPTY_OBJ); // {[titleId]: [number]}
export const useUserRatings = () => useStored("viv:user_ratings", EMPTY_OBJ); // {[titleId]: number (1-10)}
export const useSchedule = () => useStored("viv:schedule", EMPTY_LIST); // [id]
export const useReadNotifications = () => useStored("viv:notifications_read", EMPTY_LIST);
export const useDismissedNotifications = () => useStored("viv:notifications_dismissed", EMPTY_LIST);

export function toggleScheduleItem(setSchedule, titleId) {
  setSchedule((prev) => {
    const list = prev || [];
    return list.includes(titleId) ? list.filter((x) => x !== titleId) : [...list, titleId];
  });
}

export function setUserRating(setRatings, titleId, score) {
  setRatings((prev) => ({
    ...(prev || {}),
    [titleId]: score,
  }));
}

export function toggleWatchedEpisode(setWatched, titleId, epNumber) {
  setWatched((prev) => {
    const list = prev?.[titleId] || [];
    const exists = list.includes(epNumber);
    const updated = exists ? list.filter((n) => n !== epNumber) : [...list, epNumber];
    return {
      ...(prev || {}),
      [titleId]: updated,
    };
  });
}

export function touchHistory(setHistory, id, progress = 0.05, timeLeft) {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("viv:settings");
      if (raw && JSON.parse(raw)?.incognito) return;
    } catch {}
  }
  setHistory((h) => {
    const rest = (h || []).filter((x) => x.id !== id);
    const prev = (h || []).find((x) => x.id === id);
    return [
      {
        id,
        progress: Math.max(prev?.progress || 0, progress),
        timeLeft: timeLeft || prev?.timeLeft,
        at: Date.now(),
      },
      ...rest,
    ].slice(0, 40);
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
    id: "jayesh",
    name: "Jayesh",
    avatar: "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    isKids: false,
  },
];

export const PROFILE_AVATARS = [
  { id: "spiderman", name: "Spider-Man", url: "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg" },
  { id: "batman", name: "Batman", url: "https://image.tmdb.org/t/p/w185/74xTEgt7R36Fpooo50r9T25onhq.jpg" },
  { id: "ironman", name: "Iron Man", url: "https://image.tmdb.org/t/p/w185/78lPtwv72eTNqFW9COBYI0dWDJa.jpg" },
  { id: "deadpool", name: "Deadpool", url: "https://image.tmdb.org/t/p/w185/yGSxMiF0cYuA2AhBuBhE5Bp79p8.jpg" },
  { id: "cyberpunk", name: "Cyberpunk", url: "https://image.tmdb.org/t/p/w185/614k6C9doThoMe6GyH0nTnGgLXt.jpg" },
  { id: "anime", name: "Anime Hero", url: "https://image.tmdb.org/t/p/w185/3mrli3xsGrAieQks7KsBUm2LpCg.jpg" },
];

export const useProfiles = () => useStored("viv:profiles", DEFAULT_PROFILES);
export const useActiveProfileId = () => useStored("viv:active_profile_id", "jayesh");

export function switchProfile(setActiveId, setSettings, profile) {
  setActiveId(profile.id);
  setSettings((s) => ({
    ...s,
    name: profile.name,
    avatar: profile.avatar,
    activeProfileId: profile.id,
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

export function clearCustomList(setCustomLists, listId) {
  setCustomLists((lists) =>
    (lists || []).map((l) => (l.id === listId ? { ...l, items: [] } : l))
  );
}
