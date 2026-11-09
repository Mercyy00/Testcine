import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  Tv,
  Film,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Check,
  Star,
  Download,
  Share2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cast,
  Captions,
  Maximize,
  PictureInPicture2,
  Play,
  RectangleHorizontal,
  RotateCcw,
  RotateCw,
  Settings,
  Volume2,
  Zap,
  Server,
} from "lucide-react";
import Layout from "../../components/Layout";
import Art from "../../components/Art";
import VideoPlayer from "../../components/VideoPlayer";
import { getAllCardTitles, getTitle } from "../../lib/data.server";
import { fetchLiveTitle } from "../../lib/tmdb";
import { fetchAniListDetails, extractAniListId } from "../../lib/anilist";
import { resolveGreekGodSources, resolveMediaIdentifiers } from "../../lib/servers";
import {
  useHistory,
  useSettings,
  useList,
  useReactions,
  useWatchedEpisodes,
  toggleWatchedEpisode,
  toggleListEntry,
  toSnapshot,
  inList,
} from "../../lib/store";
import { useToast } from "../../lib/useToast";
import styles from "../../styles/Watch.module.css";

export function getStaticPaths() {
  return {
    paths: getAllCardTitles().filter((t) => t.status !== "upcoming").map((t) => ({
      params: { id: t.id },
    })),
    fallback: "blocking",
  };
}

export async function getStaticProps({ params }) {
  const { id } = params;
  if (!id || typeof id !== "string" || !/^[a-zA-Z0-9_.-]{1,200}$/.test(id)) {
    return { notFound: true };
  }

  let t = getTitle(id);

  const anilistId = extractAniListId(id);
  const isAnime =
    Boolean(anilistId) ||
    id.startsWith("anilist-") ||
    id.startsWith("anime-") ||
    (t?.type === "anime" && (!t?.episodes || t.episodes.length === 0));

  if (isAnime) {
    if (!t || !t.episodes || t.episodes.length === 0) {
      try {
        const liveAnime = await fetchAniListDetails(id);
        if (liveAnime) {
          const preservedTmdbId = t?.tmdbId || liveAnime?.tmdbId || null;
          const maxSeasons = Math.max(
            typeof t?.seasons === "number" ? t.seasons : 0,
            typeof t?.numberOfSeasons === "number" ? t.numberOfSeasons : 0,
            typeof liveAnime?.seasons === "number" ? liveAnime.seasons : 0,
            typeof liveAnime?.numberOfSeasons === "number" ? liveAnime.numberOfSeasons : 0,
            Array.isArray(t?.seasonsList) ? t.seasonsList.length : 0,
            Array.isArray(liveAnime?.seasonsList) ? liveAnime.seasonsList.length : 0,
            1
          );

          t = {
            ...(t || {}),
            ...liveAnime,
            tmdbId: preservedTmdbId,
            seasons: maxSeasons,
            numberOfSeasons: maxSeasons,
          };
        }
      } catch (e) {
        console.error("Watch live AniList error:", e.message || e);
      }
    }
  } else {
    const isSeries = t ? t.type !== "movie" : !id.startsWith("movie-");
    const needsFullSeasons = isSeries && (!t?.seasonsList || t.seasonsList.length <= 1);

    if (!t || needsFullSeasons) {
      let type = isSeries ? "tv" : "movie";
      let tmdbId = t?.tmdbId || id;
      if (typeof id === "string") {
        if (id.startsWith("movie-")) type = "movie";
        else if (id.startsWith("tv-") || id.startsWith("series-")) type = "tv";
      }

      try {
        const live = await fetchLiveTitle(type, tmdbId);
        if (live) {
          t = { ...(t || {}), ...live };
        } else if (!t) {
          const fallbackType = type === "movie" ? "tv" : "movie";
          t = await fetchLiveTitle(fallbackType, tmdbId);
        }
      } catch (e) {
        console.error("Watch live fetch error:", e.message || e);
      }
    }
  }

  if (!t) {
    return { notFound: true };
  }

  return {
    props: {
      initialTitle: t,
      id,
    },
    revalidate: 1800,
  };
}

function WatchContent({ title: t, id, season, episode, isReady }) {
  const router = useRouter();
  const [toast, showToast] = useToast(2400);
  const [mode, setMode] = useState("player");
  const [history, setHistory] = useHistory();
  const [list, setList] = useList();
  const [reactions, setReactions] = useReactions();
  const [watchedEpisodes, setWatchedEpisodes] = useWatchedEpisodes();
  const [settings] = useSettings();

  const [showFullOverview, setShowFullOverview] = useState(false);

  const currentSeason = Number(season) || 1;
  const currentEpisode = Number(episode) || 1;

  const isSeries = t.type !== "movie";

  // Ensure season and episode numbers are always explicitly mentioned in the URL for TV/anime
  useEffect(() => {
    if (!isReady || !router.isReady) return;
    if (isSeries && (!router.query.season || !router.query.episode)) {
      router.replace(
        `/watch/${t.id}?season=${currentSeason}&episode=${currentEpisode}`,
        undefined,
        { shallow: true }
      );
    }
  }, [isReady, router.isReady, isSeries, t.id, currentSeason, currentEpisode, router]);

  // Capture initial resume time ONCE on mount / season / episode change
  // so ongoing playback timeupdates do not trigger source refetches or re-renders
  const currentMediaKey = `${id}-s${currentSeason}-e${currentEpisode}`;
  const lastMediaKeyRef = useRef(null);
  const initialSavedSecondsRef = useRef(0);
  const initialProgressRef = useRef(0);

  if (lastMediaKeyRef.current !== currentMediaKey) {
    lastMediaKeyRef.current = currentMediaKey;
    const initialItem = history.find(
      (item) =>
        item.id === t.id &&
        (!isSeries || ((item.season || 1) === currentSeason && (item.episode || 1) === currentEpisode))
    );
    initialProgressRef.current = initialItem?.progress || 0;
    initialSavedSecondsRef.current =
      initialItem?.currentTime ||
      (initialItem?.progress && initialItem?.secondsLeft && initialItem.progress > 0 && initialItem.progress < 0.95
        ? Math.floor((initialItem.secondsLeft / (1 - initialItem.progress)) * initialItem.progress)
        : 0);
  }

  const initialResumeSeconds = initialSavedSecondsRef.current || 0;
  const initialResumeProgress = initialProgressRef.current || 0;

  // Initialize immediately with Greek God servers (Zeus default, Poseidon, etc.)
  const [sources, setSources] = useState(() => {
    try {
      const initialResolved = resolveGreekGodSources({
        id,
        type: t.type,
        tmdbId: t.tmdbId,
        anilistId: t.anilistId || extractAniListId(id) || extractAniListId(t.id),
        season: currentSeason,
        episode: currentEpisode,
        progress: initialResumeSeconds,
        autoplay: true,
        title: t.title,
        backdrop: t.backdrop,
        poster: t.poster,
      });
      return {
        loading: false,
        servers: initialResolved.servers,
        default: initialResolved.default,
        error: "",
      };
    } catch {
      return { loading: false, servers: [], default: null, error: "" };
    }
  });
  const [request, setRequest] = useState(0);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const sourcePickerRef = useRef(null);

  useEffect(() => {
    if (!showSourceMenu) return;

    const handleOutsideClick = (e) => {
      if (sourcePickerRef.current && !sourcePickerRef.current.contains(e.target)) {
        setShowSourceMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowSourceMenu(false);
      }
    };

    const handleBlur = () => {
      setShowSourceMenu(false);
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [showSourceMenu]);

  const [showSeasonMenu, setShowSeasonMenu] = useState(false);
  const seasonPickerRef = useRef(null);

  useEffect(() => {
    if (!showSeasonMenu) return;

    const handleOutsideClick = (e) => {
      if (seasonPickerRef.current && !seasonPickerRef.current.contains(e.target)) {
        setShowSeasonMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowSeasonMenu(false);
      }
    };

    const handleBlur = () => {
      setShowSeasonMenu(false);
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [showSeasonMenu]);

  useEffect(() => {
    setSelectedServerId(null);
    setShowSourceMenu(false);
    setShowSeasonMenu(false);
  }, [id, season, episode]);

  const isSaved = inList(list, t.id);
  const userReaction = reactions?.[t.id] || null;
  const activeServer = sources.servers.find((server) => server.id === (selectedServerId || sources.default));

  const watchedList = (t.id && watchedEpisodes?.[t.id]) || [];

  const totalSeasons = useMemo(() => {
    if (!isSeries || !t) return 1;
    return Math.max(
      typeof t.seasons === "number" ? t.seasons : 0,
      typeof t.numberOfSeasons === "number" ? t.numberOfSeasons : 0,
      Array.isArray(t.seasonsList) ? t.seasonsList.length : 0,
      1
    );
  }, [isSeries, t]);

  const [seasonEpisodesMap, setSeasonEpisodesMap] = useState({});

  useEffect(() => {
    if (!isSeries || !t || currentSeason === 1) return;
    if (seasonEpisodesMap[currentSeason]) return;

    const { numericTmdbId } = resolveMediaIdentifiers({
      id: t.id,
      tmdbId: t.tmdbId,
      anilistId: t.anilistId,
      type: t.type,
    });
    if (!numericTmdbId) return;

    let active = true;
    fetch(`/api/tmdb/season?tvId=${numericTmdbId}&season=${currentSeason}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.episodes) return;
        setSeasonEpisodesMap((prev) => ({
          ...prev,
          [currentSeason]: data.episodes,
        }));
      })
      .catch((err) => {
        if (!active) return;
        console.error("Watch season fetch error:", err);
      });

    return () => {
      active = false;
    };
  }, [isSeries, t, currentSeason, seasonEpisodesMap]);

  // Episodes for series/anime (strictly ordered 1..N)
  const episodesList = useMemo(() => {
    if (!isSeries || !t) return [];
    if (seasonEpisodesMap[currentSeason] && seasonEpisodesMap[currentSeason].length > 0) {
      const list = [...seasonEpisodesMap[currentSeason]];
      list.sort((a, b) => (Number(a.episodeNumber ?? a.episode_number) || 0) - (Number(b.episodeNumber ?? b.episode_number) || 0));
      return list;
    }
    if (currentSeason === 1) {
      const source = (t.episodes && t.episodes.length > 0) ? t.episodes : (t.seasons?.[0]?.episodes || []);
      const list = [...source];
      list.sort((a, b) => (Number(a.episodeNumber ?? a.episode_number) || 0) - (Number(b.episodeNumber ?? b.episode_number) || 0));
      return list;
    }
    // Fallback for currentSeason > 1
    const count = (t.episodes?.length) || 12;
    const fallback = [];
    for (let i = 1; i <= count; i++) {
      fallback.push({
        episodeNumber: i,
        title: `Episode ${i}`,
        overview: `Season ${currentSeason}, Episode ${i}`,
        still: t.backdrop || t.poster,
        runtime: t.runtime || 24,
      });
    }
    return fallback;
  }, [isSeries, t, currentSeason, seasonEpisodesMap]);

  const currentEpisodeObj = episodesList.find((e) => e.episodeNumber === currentEpisode) || episodesList[0];
  const totalEpisodes = episodesList.length;

  // Recommendations for "More like this"
  const recommendations = useMemo(() => {
    if (t.recommendations && t.recommendations.length > 0) {
      return t.recommendations.slice(0, 6);
    }
    return [];
  }, [t]);

  // Fetch streaming sources and sync with server
  useEffect(() => {
    if (!isReady) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ id, type: t.type });
    if (t.tmdbId) query.set("tmdbId", String(t.tmdbId));
    const aniId = t.anilistId || extractAniListId(id) || extractAniListId(t.id);
    if (aniId) query.set("anilistId", String(aniId));
    if (t.title) query.set("title", t.title);
    if (t.poster) query.set("poster", t.poster);
    if (t.type !== "movie") {
      query.set("season", String(currentSeason));
      query.set("episode", String(currentEpisode));
    }
    if (initialResumeSeconds > 10) {
      query.set("progress", String(initialResumeSeconds));
    }

    fetch(`/api/sources?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load streaming servers.");
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted && data?.servers?.length) {
          setSources({ ...data, loading: false, error: "" });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setSources((prev) =>
            prev.servers.length > 0
              ? prev
              : {
                  loading: false,
                  servers: [],
                  default: null,
                  error: error.message || "Could not load streaming servers.",
                }
          );
        }
      });

    return () => controller.abort();
  }, [id, t.type, t.tmdbId, t.anilistId, t.title, t.poster, currentSeason, currentEpisode, isReady, request]);

  const lastSaveTimeRef = useRef(0);
  const lastSaveTimestampRef = useRef(0);

  const saveProgress = useCallback(
    (time, duration) => {
      if (!Number.isFinite(time) || time < 0) return;
      const validDuration =
        Number.isFinite(duration) && duration > 0
          ? duration
          : t?.runtime
          ? t.runtime * 60
          : 0;
      if (!validDuration || validDuration <= 0) return;

      const now = Date.now();
      // Throttle saving history to at most once every 3 seconds to avoid re-rendering and tearing iframe on subsecond ticks
      if (now - lastSaveTimestampRef.current < 3000 && Math.abs(time - lastSaveTimeRef.current) < 3) {
        return;
      }
      lastSaveTimestampRef.current = now;
      lastSaveTimeRef.current = time;

      const progress = Math.min(1, Math.max(0, time / validDuration));
      const minsLeft = Math.ceil((validDuration - time) / 60);
      const timeLeft =
        minsLeft > 60
          ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m left`
          : `${minsLeft}m left`;

      const entry = {
        id: t.id,
        title: toSnapshot(t),
        progress,
        timeLeft,
        secondsLeft: Math.ceil(validDuration - time),
        currentTime: Math.floor(time),
        duration: Math.floor(validDuration),
        at: now,
        ...(isSeries ? { season: currentSeason, episode: currentEpisode } : {}),
      };

      setHistory((previous) => {
        const list = previous || [];
        const filtered = list.filter((item) => {
          if (item.id !== t.id) return true;
          if (!isSeries) return false;
          return !((item.season || 1) === currentSeason && (item.episode || 1) === currentEpisode);
        });
        return [entry, ...filtered].slice(0, 60);
      });
    },
    [t, isSeries, currentSeason, currentEpisode, setHistory]
  );

  const handleMarkWatched = useCallback(() => {
    if (isSeries && t.id) {
      const epKey = currentSeason > 1 ? `s${currentSeason}_e${currentEpisode}` : currentEpisode;
      const altKey = currentSeason === 1 ? `s1_e${currentEpisode}` : null;
      toggleWatchedEpisode(setWatchedEpisodes, t.id, epKey, altKey);
    }
  }, [isSeries, t.id, currentSeason, currentEpisode, setWatchedEpisodes]);

  const hasNext = isSeries && currentEpisode < totalEpisodes;
  const goNext = useCallback(() => {
    if (hasNext) {
      router.push(`/watch/${t.id}?season=${currentSeason}&episode=${currentEpisode + 1}`);
    }
  }, [router, t.id, currentSeason, currentEpisode, hasNext]);

  const goPrev = useCallback(() => {
    if (currentEpisode > 1) {
      router.push(`/watch/${t.id}?season=${currentSeason}&episode=${currentEpisode - 1}`);
    }
  }, [router, t.id, currentSeason, currentEpisode]);

  const room = typeof router.query.room === "string" && /^[A-Za-z2-9]{5}$/.test(router.query.room) ? router.query.room : null;

  const handleReaction = (type) => {
    setReactions((prev) => ({
      ...(prev || {}),
      [t.id]: prev?.[t.id] === type ? null : type,
    }));
    showToast(type === "like" ? "Added to Liked" : "Marked as Not for me");
  };

  const handleShare = async () => {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!");
    }
  };

  const overview = t.overview || "No synopsis available.";
  const synopsisLimit = 205;
  const showMore = overview.length > synopsisLimit;
  const displayedOverview = !showFullOverview && showMore
    ? `${overview.slice(0, synopsisLimit).trimEnd()}…`
    : overview;

  return (
    <div className={styles.watchLayout}>
        {/* ── LEFT COLUMN: PLAYER & DETAILS ────────────────────────────── */}
      <div className={styles.mainCol}>
        {/* Video Player Container */}
        {mode === "trailer" && t.trailerKey ? (
          <div className={styles.stage}>
            <iframe
              className={styles.trailer}
              src={`https://www.youtube-nocookie.com/embed/${t.trailerKey}?autoplay=1&rel=0`}
              title={`${t.title} Official Trailer`}
              allow="autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
            <div className={styles.top}>
              <Link href={`/title/${t.id}`} className={styles.back}>
                <ArrowLeft size={20} />
                <span>{t.title}</span>
              </Link>
              <button
                type="button"
                className={`chip ${styles.trailerButton}`}
                onClick={() => setMode("player")}
              >
                <Tv size={14} />
                <span>Switch to Player</span>
              </button>
            </div>
          </div>
        ) : (sources.default || sources.servers.length > 0) && !sources.loading ? (
          <VideoPlayer
            servers={sources.servers}
            defaultServer={selectedServerId || sources.default}
            title={t}
            initialProgress={initialResumeProgress}
            initialProgressSeconds={initialResumeSeconds}
            onProgress={saveProgress}
            onWatched={handleMarkWatched}
            nextEpisode={hasNext ? { season: currentSeason, episode: currentEpisode + 1 } : null}
            onNext={goNext}
            onEpisodeSelect={(s, ep) => {
              router.push(`/watch/${t.id}?season=${s}&episode=${ep}`);
            }}
            onExit={() => {
              router.push(`/title/${t.id}`);
            }}
            room={room}
            partyName={settings.name || "Guest"}
          >
            <Link href={`/title/${t.id}`} className={styles.back}>
              <ArrowLeft size={20} />
              <span>{t.title}</span>
            </Link>
          </VideoPlayer>
        ) : (
          <div className={styles.stage}>
            <Art title={t} variant="backdrop" className={styles.art} />
            <div className={styles.unavailableShade} />
            <div className={styles.top} aria-hidden="true">
              <button type="button" className={styles.previewCast} aria-label="Cast to TV" disabled>
                <Cast size={22} />
              </button>
            </div>
            <div className={styles.status} role={sources.error ? "alert" : "status"}>
              <p>{sources.loading ? "Finding streaming servers…" : sources.error || "No streams are available for this title."}</p>
              {!sources.loading && (
                <button type="button" className="chip" onClick={() => setRequest((value) => value + 1)}>
                  Retry sources
                </button>
              )}
            </div>
            <div className={styles.previewBar} aria-label="Player controls unavailable">
              <input className={styles.seek} type="range" min="0" max="0" value="0" disabled aria-label="Seek time" />
              <div className={styles.controls}>
                <div className={styles.controlsLeft}>
                  <button type="button" className={styles.btn} disabled aria-label="Play"><Play size={22} fill="currentColor" /></button>
                  <button type="button" className={styles.btn} disabled aria-label="Back 10 seconds"><RotateCcw size={19} /></button>
                  <button type="button" className={styles.btn} disabled aria-label="Forward 10 seconds"><RotateCw size={19} /></button>
                  <button type="button" className={styles.btn} disabled aria-label="Mute"><Volume2 size={20} /></button>
                  <input className={styles.volume} type="range" min="0" max="1" value="1" disabled aria-label="Volume" />
                  <span className={styles.time}>0:00 / 0:00</span>
                </div>
                <div className={styles.controlsRight}>
                  <button type="button" className={styles.btn} disabled aria-label="Picture-in-Picture"><PictureInPicture2 size={19} /></button>
                  <button type="button" className={styles.btn} disabled aria-label="Subtitles"><Captions size={19} /></button>
                  <button type="button" className={styles.btn} disabled aria-label="Settings"><Settings size={19} /></button>
                  <button type="button" className={styles.btn} disabled aria-label="Theatre mode"><RectangleHorizontal size={19} /></button>
                  <button type="button" className={styles.btn} disabled aria-label="Fullscreen"><Maximize size={19} /></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Title & Subtitle */}
        <div className={styles.titleArea}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className={styles.mainTitle}>{t.title}</h1>
            {t.anilistId && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#cbd5e1",
                  letterSpacing: "0.5px",
                }}
              >
                AniList #{t.anilistId}
              </span>
            )}
          </div>
          {isSeries && currentEpisodeObj && (
            <p className={styles.subTitle}>
              S{currentSeason} E{currentEpisode} {currentEpisodeObj.title}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className={styles.actionBtnsRow}>
          {/* Like / Dislike Group */}
          <div className={styles.likeDislikeGroup}>
            <button
              type="button"
              className={`${styles.likeBtn} ${userReaction === "like" ? styles.likeBtnActive : ""}`}
              onClick={() => handleReaction("like")}
              aria-label="Like this title"
              title="Like this title"
            >
              <ThumbsUp size={15} />
            </button>
            <div className={styles.likeDivider} />
            <button
              type="button"
              className={`${styles.dislikeBtn} ${userReaction === "dislike" ? styles.dislikeBtnActive : ""}`}
              onClick={() => handleReaction("dislike")}
              aria-label="Dislike this title"
              title="Dislike this title"
            >
              <ThumbsDown size={15} />
            </button>
          </div>

          {/* Save / Watchlist */}
          <button
            type="button"
            className={`${styles.actionPillBtn} ${isSaved ? styles.actionPillBtnActive : ""}`}
            onClick={() => {
              toggleListEntry(setList, t.id, t);
              showToast(isSaved ? "Removed from watchlist" : "Saved to watchlist");
            }}
          >
            {isSaved ? <Check size={16} /> : <Bookmark size={16} />}
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>

          {/* Server selector (Greek Gods) */}
          <div ref={sourcePickerRef} className={styles.sourcePicker}>
            <button
              type="button"
              className={`${styles.actionPillBtn} ${showSourceMenu ? styles.actionPillBtnActive : ""}`}
              aria-label={`Server: ${activeServer?.name || "Zeus"}`}
              aria-expanded={showSourceMenu}
              onClick={() => setShowSourceMenu((open) => !open)}
            >
              <Server size={14} className={styles.serverIcon} />
              <span>Server: <strong className={styles.serverNameBold}>{activeServer?.name || "Zeus"}</strong></span>
              <ChevronDown size={13} className={`${styles.chevronIcon} ${showSourceMenu ? styles.chevronRotated : ""}`} />
            </button>
            {showSourceMenu && (
              <div className={styles.sourceMenu} role="menu" aria-label="Streaming servers">
                <div className={styles.sourceMenuHeader}>
                  <span className={styles.sourceMenuTitle}>Streaming Servers</span>
                  <span className={styles.sourceMenuCount}>{sources.servers.length} mirrors</span>
                </div>
                {sources.servers.length ? (
                  sources.servers.map((server) => {
                    const isActive = server.id === (selectedServerId || sources.default);
                    return (
                      <button
                        key={server.id}
                        type="button"
                        className={`${styles.sourceOption} ${isActive ? styles.sourceOptionActive : ""}`}
                        disabled={server.status !== "online"}
                        role="menuitem"
                        onClick={() => {
                          setSelectedServerId(server.id);
                          setShowSourceMenu(false);
                        }}
                      >
                        <div className={styles.sourceChoice}>
                          <span className={styles.sourceIndicator}>
                            {isActive ? (
                              <span className={styles.sourceDotActive} />
                            ) : (
                              <span className={styles.sourceDotIdle} />
                            )}
                          </span>
                          <span className={styles.sourceName}>{server.name}</span>
                        </div>
                        <div className={styles.sourceMeta}>
                          {server.id === "zeus" ? (
                            <span className={styles.sourceBadgeDefault}>Default</span>
                          ) : server.status === "online" ? (
                            <span className={styles.sourceBadgeOnline}>Online</span>
                          ) : (
                            <span className={styles.sourceBadgeOffline}>Offline</span>
                          )}
                          {isActive && <Check size={13} strokeWidth={2.5} className={styles.sourceCheckIcon} />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className={styles.sourceEmpty}>{sources.loading ? "Finding servers…" : "No servers available"}</p>
                )}
              </div>
            )}
          </div>

          {/* Download */}
          <button
            type="button"
            className={`${styles.actionPillBtn} ${styles.actionIconBtn}`}
            aria-label="Download"
            onClick={() => showToast("Downloads are not available for this stream")}
          >
            <Download size={16} />
          </button>

          {/* Share */}
          <button type="button" className={`${styles.actionPillBtn} ${styles.actionIconBtn}`} onClick={handleShare} aria-label="Share">
            <Share2 size={16} />
          </button>
        </div>

        {/* Metadata Box */}
        <div className={styles.metaBox}>
          <div className={styles.metaHeaderLine}>
            {(t.releaseDate || t.year) && <span>{t.releaseDate || t.year}</span>}
            {(t.releaseDate || t.year) && t.rating > 0 && <span className={styles.metaDot}>·</span>}
            {t.rating > 0 && <span>★ {t.rating}</span>}
            {isSeries && (
              <>
                {(t.releaseDate || t.year || t.rating > 0) && <span className={styles.metaDot}>·</span>}
                <span className={styles.metaEpisodePill}>
                  S{currentSeason} E{currentEpisode}
                </span>
              </>
            )}
          </div>

          <p className={styles.synopsisText}>
            {displayedOverview}
            {showMore && (
              <button
                type="button"
                className={styles.moreToggleBtn}
                onClick={() => setShowFullOverview((v) => !v)}
              >
                {showFullOverview ? "less" : "...more"}
              </button>
            )}
          </p>
        </div>

      </div>

      {/* ── RIGHT COLUMN: EPISODES PLAYLIST & RECOMMENDATIONS ─────────── */}
      <div className={styles.sideCol}>
        {/* If Series / Anime: Episodes Playlist */}
          {isSeries && (
          <div>
            <div className={styles.playlistHeader}>
              <div className={styles.seasonPickerWrap} ref={seasonPickerRef}>
                <button
                  type="button"
                  className={`${styles.seasonSelectBtn} ${totalSeasons > 1 ? styles.seasonSelectBtnClickable : ""}`}
                  onClick={() => totalSeasons > 1 && setShowSeasonMenu((prev) => !prev)}
                  aria-expanded={showSeasonMenu}
                  aria-haspopup="listbox"
                  aria-label={`Select season (Current: Season ${currentSeason})`}
                >
                  <span>Season {currentSeason}</span>
                  {totalSeasons > 1 && (
                    <ChevronDown
                      size={14}
                      className={`${styles.chevronIcon} ${showSeasonMenu ? styles.chevronRotated : ""}`}
                    />
                  )}
                </button>
                {showSeasonMenu && totalSeasons > 1 && (
                  <div className={styles.seasonMenu} role="listbox">
                    <div className={styles.seasonMenuHeader}>
                      <span>Seasons</span>
                      <span className={styles.seasonMenuCount}>{totalSeasons} seasons</span>
                    </div>
                    {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((sNum) => {
                      const isCurrent = sNum === currentSeason;
                      return (
                        <button
                          key={sNum}
                          type="button"
                          className={`${styles.seasonOption} ${isCurrent ? styles.seasonOptionActive : ""}`}
                          onClick={() => {
                            setShowSeasonMenu(false);
                            router.push(`/watch/${t.id}?season=${sNum}&episode=1`);
                          }}
                        >
                          <span className={styles.seasonOptionNumber}>Season {sNum}</span>
                          {isCurrent && <Check size={13} strokeWidth={2.5} className={styles.sourceCheckIcon} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className={styles.playlistNav}>
                <span>{totalEpisodes > 0 ? `${currentEpisode} / ${totalEpisodes}` : "Episode data unavailable"}</span>
                <button
                  type="button"
                  className={styles.navArrowBtn}
                  onClick={goPrev}
                  disabled={currentEpisode <= 1}
                  aria-label="Previous episode"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className={styles.navArrowBtn}
                  onClick={goNext}
                  disabled={currentEpisode >= totalEpisodes}
                  aria-label="Next episode"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className={styles.episodesScrollList}>
              {episodesList.length ? episodesList.map((ep) => {
                const isActive = ep.episodeNumber === currentEpisode;
                const isEpWatched =
                  watchedList.some((item) => {
                    const s = String(item);
                    const epStr = String(ep.episodeNumber);
                    if (currentSeason === 1 && (Number(item) === ep.episodeNumber || s === epStr || s === `s1_e${epStr}`)) return true;
                    return s === `s${currentSeason}_e${epStr}`;
                  }) || isActive;
                return (
                  <Link
                    key={ep.episodeNumber}
                    href={`/watch/${t.id}?season=${currentSeason}&episode=${ep.episodeNumber}`}
                    className={`${styles.epItemRow} ${isActive ? styles.epItemActive : ""}`}
                  >
                    <div className={styles.epThumbWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ep.still || t.backdrop || t.poster}
                        alt={ep.title}
                        className={styles.epThumbImg}
                        loading="lazy"
                      />
                      {isEpWatched && (
                        <span className={styles.epCheckBadge}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className={styles.epInfoCol}>
                      <span className={styles.epTitleText}>
                        {ep.episodeNumber}. {ep.title}
                      </span>
                      <span className={styles.epSubText}>
                        {isActive ? (
                          <span className={styles.epNowPlaying}>Now playing · </span>
                        ) : null}
                        {ep.runtime ? `${ep.runtime} min` : ""}
                      </span>
                    </div>
                  </Link>
                );
              }) : <p className={styles.sourceEmpty}>Episode information is unavailable.</p>}
            </div>
          </div>
        )}

        {/* More Like This Section */}
        {recommendations.length > 0 && (
          <div>
            <h3 className={styles.moreLikeThisTitle}>More like this</h3>
            <div className={styles.moreLikeThisList}>
              {recommendations.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/watch/${rec.id}`}
                  className={styles.recItemRow}
                >
                  <div className={styles.recThumbWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rec.backdrop || rec.poster}
                      alt={rec.title}
                      className={styles.recThumbImg}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.recInfoCol}>
                    <span className={styles.recTitle}>{rec.title}</span>
                    <span className={styles.recSub}>
                      {rec.year} · {rec.type === "movie" ? "Movie" : "Series"}
                    </span>
                    <span className={styles.recRating}>★ {rec.rating}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && <div className={styles.toastNotice}>{toast}</div>}
    </div>
  );
}

export default function Watch(props) {
  return <WatchForRoute key={props.id} {...props} />;
}

function WatchForRoute({ initialTitle, id }) {
  const router = useRouter();
  const [liveTitle, setLiveTitle] = useState(initialTitle);
  const [loading, setLoading] = useState(!initialTitle);

  useEffect(() => {
    if (!liveTitle && id) {
      setTimeout(() => setLoading(true), 0);
      const isAnime = /^\d+$/.test(id) || id.startsWith("anilist-") || id.startsWith("anime-");
      const url = isAnime
        ? `/api/anilist/details?id=${encodeURIComponent(id)}`
        : `/api/tmdb/details?id=${encodeURIComponent(id)}`;

      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.title) setLiveTitle(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id, liveTitle]);

  const t = liveTitle || initialTitle;
  const season = router.query.season ?? "1";
  const episode = router.query.episode ?? router.query.ep ?? "1";

  if (router.isFallback || (!t && loading)) {
    return (
      <Layout title="Loading Stream · Vivarium">
        <div
          className={styles.stage}
          style={{
            minHeight: "85vh",
            position: "relative",
            overflow: "hidden",
            background: "#050505",
          }}
        >
          <div className="skeleton" style={{ position: "absolute", inset: 0, opacity: 0.15 }} />
          <div className={styles.top}>
            <div className="skeleton" style={{ width: 140, height: 36, borderRadius: 20 }} />
            <div className="skeleton" style={{ width: 100, height: 28, borderRadius: 14 }} />
          </div>
          <div className={styles.status} style={{ pointerEvents: "none" }}>
            <div
              className="skeleton"
              style={{ width: 48, height: 48, borderRadius: "50%", margin: "0 auto 16px" }}
            />
            <p style={{ color: "var(--text-soft)", fontSize: "14px", fontWeight: 500 }}>
              Preparing stream…
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!t) {
    return (
      <Layout title="Title not found">
        <div className="pageInner">
          <h1>Title not found</h1>
          <Link href="/">Return Home</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Watching ${t.title} · Vivarium`} image={t.backdrop || t.poster} flush>
      <WatchContent
        key={`${id}:${season}:${episode}`}
        title={t}
        id={id}
        season={season}
        episode={episode}
        isReady={router.isReady}
      />
    </Layout>
  );
}
