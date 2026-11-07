import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { runtimeLabel } from "../../lib/constants";
import { getCollection, getAllCollections, getTitle } from "../../lib/data.server";
import { fetchLiveCollection } from "../../lib/tmdb";
import { useList, inList, toggleListEntry } from "../../lib/store";
import { useToast } from "../../lib/useToast";
import {
  Play,
  Plus,
  Check,
  Share2,
  ChevronLeft,
  Film,
  Layers,
} from "lucide-react";
import styles from "../../styles/Collection.module.css";

export function getStaticPaths() {
  const collections = getAllCollections();
  const paths = collections.flatMap((c) => {
    const slug = (c.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return [
      { params: { id: String(c.id) } },
      { params: { id: slug } },
    ];
  });

  return {
    paths,
    fallback: "blocking",
  };
}

export async function getStaticProps({ params }) {
  let col = getCollection(params.id);
  if (!col) {
    try {
      col = await fetchLiveCollection(params.id);
    } catch (e) {
      console.error("fetchLiveCollection error:", e);
    }
  }

  if (!col) {
    return { notFound: true };
  }

  // Resolve parts to full title objects if available
  const parts = (col.parts || []).map((p) => {
    const full = getTitle(p.id) || getTitle(p.tmdbId);
    if (full) {
      return {
        ...p,
        ...full,
        id: full.id,
      };
    }
    return p;
  });

  return {
    props: {
      collection: {
        ...col,
        parts,
      },
    },
    revalidate: 1800,
  };
}

export default function CollectionPage({ collection: initialCollection }) {
  const router = useRouter();
  const [collection, setCollection] = useState(initialCollection);
  const [watchlist, setWatchlist] = useList();
  const [toast, showToast] = useToast(2500);

  useEffect(() => {
    if (!collection && router.query.id) {
      fetch(`/api/tmdb/collection?id=${encodeURIComponent(router.query.id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setCollection(data);
        })
        .catch(() => {});
    }
  }, [collection, router.query.id]);

  if (router.isFallback || (!collection && router.query.id)) {
    return (
      <Layout title="Loading Collection · Vivarium">
        <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
          Loading collection from TMDB...
        </div>
      </Layout>
    );
  }

  if (!collection) {
    return (
      <Layout title="Collection Not Found">
        <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <h2>Collection not found</h2>
          <Link href="/discover" style={{ padding: "10px 20px", borderRadius: "999px", background: "#fff", color: "#000", fontWeight: 600 }}>
            Browse Catalogue
          </Link>
        </div>
      </Layout>
    );
  }

  const parts = collection.parts || [];
  const firstPart = parts[0];

  // Check if all parts are saved in watchlist
  const allSaved =
    parts.length > 0 && parts.every((p) => (watchlist || []).includes(p.id));

  const handleToggleAllWatchlist = () => {
    if (allSaved) {
      const partIds = new Set(parts.map((p) => p.id));
      setWatchlist((l) => (l || []).filter((id) => !partIds.has(id)));
      showToast(`Removed all from Watchlist`);
    } else {
      const partIds = parts.map((p) => p.id).filter(Boolean);
      setWatchlist((l) => Array.from(new Set([...partIds, ...(l || [])])));
      showToast(`Added all ${parts.length} films to Watchlist`);
    }
  };

  const handleToggleSingle = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const inList = (watchlist || []).includes(id);
    setWatchlist((l) =>
      inList ? (l || []).filter((x) => x !== id) : [id, ...(l || [])]
    );
    showToast(inList ? "Removed from Watchlist" : "Saved to Watchlist");
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast("Collection link copied to clipboard");
    }
  };

  return (
    <Layout
      title={collection.name}
      description={`Stream the complete ${collection.name} in chronological order.`}
      flush
    >
      {/* Hero Banner */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          {collection.backdrop && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={collection.backdrop}
              alt={collection.name}
              className={styles.heroImg}
            />
          )}
          <div className={styles.fadeSide} />
          <div className={styles.fadeBottom} />
        </div>

        <div className={styles.heroInner}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.back()}
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>

          <span className={styles.badge}>
            <Layers size={13} />
            <span>Collection</span>
          </span>

          <h1 className={styles.title}>{collection.name}</h1>
          <p className={styles.sub}>
            {parts.length} {parts.length === 1 ? "film" : "films"} · Complete cinematic saga
          </p>

          <div className={styles.actionsRow}>
            {firstPart && (
              <Link href={`/watch/${firstPart.id}`} className={styles.playBtn}>
                <Play size={18} fill="currentColor" />
                <span>Play Saga</span>
              </Link>
            )}

            <button
              type="button"
              className={styles.glassBtn}
              onClick={handleToggleAllWatchlist}
            >
              {allSaved ? <Check size={17} /> : <Plus size={17} />}
              <span>{allSaved ? "In Watchlist" : "Save All to Watchlist"}</span>
            </button>

            <button
              type="button"
              className={styles.glassBtn}
              onClick={handleShare}
              title="Share collection"
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </section>

      {/* Chronological Films List */}
      <section className={styles.contentSection}>
        <h2 className={styles.sectionHeading}>Films in this Collection</h2>

        <div className={styles.filmsGrid}>
          {parts.map((film, index) => {
            const isSaved = inList(watchlist, film.id);
            const runtime = runtimeLabel(film);
            const isFuture = film.status === "upcoming" || (film.year && Number(film.year) > new Date().getFullYear());

            return (
              <div key={film.id || film.tmdbId} className={styles.filmCard}>
                {/* 16:9 Thumbnail */}
                <Link href={`/title/${film.id}`} className={styles.filmThumbWrap}>
                  {film.backdrop || film.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={film.backdrop || film.poster}
                      alt={film.title}
                      className={styles.filmImg}
                    />
                  ) : null}
                  <span className={styles.filmOrderBadge}>Part {index + 1}</span>
                </Link>

                {/* Body / Info */}
                <div className={styles.filmBody}>
                  <div className={styles.filmTitleRow}>
                    <Link href={`/title/${film.id}`} style={{ textDecoration: "none" }}>
                      <h3 className={styles.filmTitle}>{film.title}</h3>
                    </Link>
                    <div className={styles.filmMeta}>
                      {film.year && <span>{film.year}</span>}
                      {runtime && (
                        <>
                          <span className={styles.dot}>•</span>
                          <span>{runtime}</span>
                        </>
                      )}
                      {film.rating > 0 && (
                        <>
                          <span className={styles.dot}>•</span>
                          <span className={styles.rating}>★ {Number(film.rating).toFixed(1)}</span>
                        </>
                      )}
                      {isFuture && (
                        <>
                          <span className={styles.dot}>•</span>
                          <span style={{ color: "#4ade80", fontWeight: 600 }}>Upcoming</span>
                        </>
                      )}
                    </div>
                  </div>

                  {film.overview && (
                    <p className={styles.filmOverview}>{film.overview}</p>
                  )}

                  {/* Action Buttons for this film */}
                  <div className={styles.filmButtons}>
                    <Link
                      href={`/watch/${film.id}`}
                      className={`${styles.itemBtn} ${styles.itemBtnPrimary}`}
                    >
                      <Play size={15} fill="currentColor" />
                      <span>Play</span>
                    </Link>

                    <Link href={`/title/${film.id}`} className={styles.itemBtn}>
                      <Film size={15} />
                      <span>Details</span>
                    </Link>

                    <button
                      type="button"
                      className={styles.itemBtn}
                      onClick={(e) => handleToggleSingle(e, film.id)}
                    >
                      {isSaved ? <Check size={14} /> : <Plus size={14} />}
                      <span>{isSaved ? "Saved" : "Watchlist"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Toast Notice */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </Layout>
  );
}
