import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Tv, Film } from "lucide-react";
import Layout from "../../components/Layout";
import Art from "../../components/Art";
import VideoPlayer from "../../components/VideoPlayer";
import { TITLES, getTitle } from "../../lib/data";
import { fetchLiveTitle } from "../../lib/tmdb";
import { useHistory } from "../../lib/store";
import styles from "../../styles/Watch.module.css";

export function getStaticPaths() {
  return {
    paths: TITLES.filter((t) => t.status !== "upcoming").map((t) => ({
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
  const saved = history.find((item) => item.id === t.id &&
    (t.type === "movie" || ((item.season || 1) === Number(season) && (item.episode || 1) === Number(episode))));

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
    setHistory((previous) => [{ id: t.id, progress: Math.min(1, Math.max(0, time / duration)),
      timeLeft: Math.ceil((duration - time) / 60), at: Date.now(),
      ...(t.type !== "movie" ? { season: Number(season), episode: Number(episode) } : {}),
    }, ...previous.filter((item) => item.id !== t.id)].slice(0, 40));
  }, [t.id, t.type, season, episode, setHistory]);

  const top = <>
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

  const t = liveTitle || initialTitle || getTitle(id);
  const season = router.query.season ?? "1";
  const episode = router.query.episode ?? router.query.ep ?? "1";

  if (router.isFallback || (!t && loading)) {
    return (
      <Layout title="Loading Stream · Vivarium" flush>
        <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
          Loading title stream from TMDB...
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
