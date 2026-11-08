import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useHistory, useList, useSettings, useReactions, useCustomLists, useUserRatings, useWatchedEpisodes } from "../lib/store";

const keyOf = (e) => `${e?.id}:${e?.season || 0}:${e?.episode || 0}`;

// Keeps localStorage and the database in step for signed-in users.
// Signed-out users are untouched (localStorage only).
export default function SyncManager() {
  const { status } = useSession();
  const [history, setHistory] = useHistory();
  const [list, setList] = useList();
  const [settings, setSettings] = useSettings();
  const [reactions, setReactions] = useReactions();
  const [customLists, setCustomLists] = useCustomLists();
  const [ratings, setRatings] = useUserRatings();
  const [watched, setWatched] = useWatchedEpisodes();
  const ready = useRef(false);
  const timer = useRef(null);
  const latest = useRef({});
  latest.current = { history, list, settings, reactions, customLists, ratings, watched };

  // 1. On login: pull server data and merge.
  useEffect(() => {
    if (status !== "authenticated") { ready.current = false; return; }
    let cancelled = false;
    fetch("/api/user/sync").then((r) => (r.ok ? r.json() : null)).then((srv) => {
      if (cancelled || !srv) return;
      const l = latest.current;
      const hm = new Map();
      [...(srv.history || []), ...(l.history || [])].forEach((e) => {
        const k = keyOf(e); const old = hm.get(k);
        if (!old || (e.at || 0) > (old.at || 0)) hm.set(k, e);
      });
      setHistory([...hm.values()].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 60));
      const seen = new Set();
      setList([...(l.list || []), ...(srv.watchlist || [])].filter((e) => {
        const id = typeof e === "string" ? e : e?.id; if (!id || seen.has(id)) return false; seen.add(id); return true;
      }));
      const x = srv.extras || {};
      if (x.reactions) setReactions({ ...x.reactions, ...(l.reactions || {}) });
      if (x.ratings) setRatings({ ...x.ratings, ...(l.ratings || {}) });
      if (x.watched) setWatched({ ...x.watched, ...(l.watched || {}) });
      if (Array.isArray(x.customLists)) {
        const ids = new Set((l.customLists || []).map((c) => c.id));
        setCustomLists([...(l.customLists || []), ...x.customLists.filter((c) => !ids.has(c.id))]);
      }
      if (x.settings) setSettings((s) => ({ ...s, ...x.settings }));
      ready.current = true;
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // 2. Debounced push on any change.
  useEffect(() => {
    if (status !== "authenticated" || !ready.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const l = latest.current;
      const { tmdbKey, ...safeSettings } = l.settings || {};
      fetch("/api/user/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: l.history, watchlist: l.list,
          extras: { settings: safeSettings, reactions: l.reactions, ratings: l.ratings, watched: l.watched, customLists: l.customLists },
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer.current);
  }, [status, history, list, settings, reactions, customLists, ratings, watched]);

  return null;
}
