import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Tv, Film } from "lucide-react";
import Layout from "../../components/Layout";
import Art from "../../components/Art";
import VideoPlayer from "../../components/VideoPlayer";
import { getAllCardTitles, getTitle } from "../../lib/data.server";
import { fetchLiveTitle } from "../../lib/tmdb";
import { useHistory } from "../../lib/store";
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
  if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    return { notFound: true };
  }

  let t = getTitle(id);

  if (!t) {
    let type = "movie";
    let tmdbId = id;
    if (id.startsWith("movie-")) {
      type = "movie";
      tmdbId = id.replace("movie-", "");
    } else if (id.startsWith("tv-") || id.startsWith("series-") || id.startsWith("anime-")) {
      type = "tv";
      tmdbId = id.replace(/^(tv|series|anime)-/, "");
    }

    try {
      t = await fetchLiveTitle(type, tmdbId);
      if (!t) {
        const fallbackType = type === "movie" ? "tv" : "movie";
        t = await fetchLiveTitle(fallbackType, tmdbId);
      }
    } catch (e) {
      console.error("Watch live fetch error:", e.message || e);
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
  const [mode, setMode] = useState("player");
  const [sources, setSources] = useState({ loading: true, servers: [], default: null, error: "" });
  const [request, setRequest] = useState(0);
  const [history, setHistory] = useHistory();
  const currentSeason = Number(season) || 1;
  const currentEpisode = Number(episode) || 1;
  const saved = history.find(
    (item) =>
      item.id === t.id &&
      (t.type === "movie" || ((item.season || 1) === currentSeason && (item.episode || 1) === currentEpisode))
  );

  useEffect(() => {
    if (!isReady) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ id, type: t.type });
    if (t.type !== "movie") { query.set("season", season); query.set("episode", episode); }
    setSources({ loading: true, servers: [], default: null, error: "" });
    fetch(`/api/sources?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load streaming servers.");
        return data;
      })
      .then((data) => { if (!controller.signal.aborted) setSources({ ...data, loading: false, error: "" }); })
      .catch((error) => {
        if (!controller.signal.aborted) setSources({ loading: false, servers: [], default: null,
          error: error.message || "Could not load streaming servers." });
      });
    return () => controller.abort();
  }, [id, t.type, season, episode, isReady, request]);

  const saveProgress = useCallback((time, duration) => {
    if (!Number.isFinite(duration) || duration <= 0) return;
    const progress = Math.min(1, Math.max(0, time / duration));
    const minsLeft = Math.ceil((duration - time) / 60);
    const timeLeft = minsLeft > 60
      ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m left`
      : `${minsLeft}m left`;

    const entry = {
      id: t.id,
      progress,
      timeLeft,
      secondsLeft: Math.ceil(duration - time),
      at: Date.now(),
      ...(t.type !== "movie" ? { season: currentSeason, episode: currentEpisode } : {}),
    };

    setHistory((previous) => {
      const list = previous || [];
      const filtered = list.filter((item) => {
        if (item.id !== t.id) return true;
        if (t.type === "movie") return false;
        return !((item.season || 1) === currentSeason && (item.episode || 1) === currentEpisode);
      });
      return [entry, ...filtered].slice(0, 60);
    });
  }, [t.id, t.type, currentSeason, currentEpisode, setHistory]);

  const top = <>
    <h1 className="visually-hidden">Watching {t.title}{t.type !== "movie" ? ` - Season ${season} Episode ${episode}` : ""}</h1>
    <Link href={`/title/${t.id}`} className={styles.back}><ArrowLeft size={20} /><span>{t.title}</span></Link>
    <div className={styles.topActions}>
      {t.trailerKey && <button type="button" className={`chip ${styles.trailerButton}`}
        onClick={() => setMode((value) => value === "trailer" ? "player" : "trailer")}>
        {mode === "trailer" ? <Tv size={14} /> : <Film size={14} />}
        {mode === "trailer" ? "Switch to Player" : "Watch Official Trailer"}
      </button>}
      <span className={styles.note}>{mode === "trailer" ? "Official trailer" : t.type === "movie" ? "Vivarium Player" : `S${season} · E${episode}`}</span>
    </div>
  </>;

  return <div className={styles.page}>
    {mode === "trailer" && t.trailerKey ? <div className={styles.stage}>
      <iframe className={styles.trailer} src={`https://www.youtube-nocookie.com/embed/${t.trailerKey}?autoplay=1&rel=0`}
        title={`${t.title} Official Trailer`} allow="autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
      <div className={styles.top}>{top}</div>
    </div> : sources.default && !sources.loading ? <VideoPlayer servers={sources.servers} defaultServer={sources.default}
      title={t} initialProgress={saved?.progress || 0} onProgress={saveProgress}>{top}</VideoPlayer> : <div className={styles.stage}>
      <Art title={t} variant="backdrop" className={styles.art} />
      <div className={styles.unavailableShade} />
      <div className={styles.top}>{top}</div>
      <div className={styles.status} role={sources.error ? "alert" : "status"}>
        <p>{sources.loading ? "Finding streaming servers…" : sources.error || "No streams are available for this title."}</p>
        {!sources.loading && <button type="button" className="chip" onClick={() => setRequest((value) => value + 1)}>Retry sources</button>}
      </div>
    </div>}
  </div>;
}

export default function Watch({ initialTitle, id }) {
  const router = useRouter();
  const [liveTitle, setLiveTitle] = useState(initialTitle);
  const [loading, setLoading] = useState(!initialTitle);

  useEffect(() => {
    if (!liveTitle && id) {
      setLoading(true);
      fetch(`/api/tmdb/details?id=${encodeURIComponent(id)}`)
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
      <Layout title="Loading Stream · Vivarium" flush>
        <div className={styles.stage} style={{ minHeight: "85vh", position: "relative", overflow: "hidden", background: "#050505" }}>
          <div className="skeleton" style={{ position: "absolute", inset: 0, opacity: 0.15 }} />
          <div className={styles.top}>
            <div className="skeleton" style={{ width: 140, height: 36, borderRadius: 20 }} />
            <div className="skeleton" style={{ width: 100, height: 28, borderRadius: 14 }} />
          </div>
          <div className={styles.status} style={{ pointerEvents: "none" }}>
            <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%", margin: "0 auto 16px" }} />
            <p style={{ color: "var(--text-dim)", fontSize: "14px", fontWeight: 500 }}>
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
    <Layout title={`Watching ${t.title}`} flush>
      <WatchContent key={`${id}:${season}:${episode}`} title={t} id={id} season={season} episode={episode} isReady={router.isReady} />
    </Layout>
  );
}
