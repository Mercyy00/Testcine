import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  useHistory,
  useList,
  useSettings,
  useReactions,
  useCustomLists,
  useUserRatings,
  useWatchedEpisodes,
  useWatchLog,
} from "../lib/store";
import { mergeUserData, cleanSettingsForSync } from "../lib/syncMerge";

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
  const [watchLog, setWatchLog] = useWatchLog();

  const ready = useRef(false);
  const timer = useRef(null);
  const latest = useRef({ history, list, settings, reactions, customLists, ratings, watched, watchLog });

  // Update ref in effect, avoiding render-time assignment
  useEffect(() => {
    latest.current = { history, list, settings, reactions, customLists, ratings, watched, watchLog };
  }, [history, list, settings, reactions, customLists, ratings, watched, watchLog]);

  // 1. On login: pull server data and merge.
  useEffect(() => {
    if (status !== "authenticated") {
      ready.current = false;
      return;
    }
    let cancelled = false;

    fetch("/api/user/sync")
      .then((r) => (r.ok ? r.json() : null))
      .then((srv) => {
        if (cancelled || !srv) return;
        const local = latest.current;
        const merged = mergeUserData(srv, local);

        setHistory(merged.history);
        setList(merged.watchlist);
        setReactions(merged.extras.reactions);
        setRatings(merged.extras.ratings);
        setWatched(merged.extras.watched);
        setCustomLists(merged.extras.customLists);
        setSettings((s) => ({ ...s, ...merged.extras.settings }));

        ready.current = true;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // 2. Debounced push on any change.
  useEffect(() => {
    if (status !== "authenticated" || !ready.current) return;
    clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      const l = latest.current;
      const safeSettings = cleanSettingsForSync(l.settings || {});

      fetch("/api/user/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          history: l.history,
          watchlist: l.list,
          extras: {
            settings: safeSettings,
            reactions: l.reactions,
            ratings: l.ratings,
            watched: l.watched,
            customLists: l.customLists,
          },
        }),
      }).catch(() => {});
    }, 1500);

    return () => clearTimeout(timer.current);
  }, [status, history, list, settings, reactions, customLists, ratings, watched]);

  return null;
}
