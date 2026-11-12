import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search as SearchIcon, X, User } from "lucide-react";
import Layout from "../components/Layout";
import { Empty } from "../components/Page";
import { SkeletonGrid } from "../components/Skeleton";
import styles from "../styles/Search.module.css";

export async function getStaticProps() {
  return {
    props: {},
    revalidate: 1800,
  };
}

const TABS = [
  { id: "all", label: "All" },
  { id: "movies", label: "Movies" },
  { id: "series", label: "Series" },
  { id: "anime", label: "Anime" },
  { id: "people", label: "People" },
];

export default function SearchPage() {
  const router = useRouter();
  const qParam = typeof router.query.q === "string" ? router.query.q : "";
  const tabParam = typeof router.query.tab === "string" ? router.query.tab : "all";

  const [inputVal, setInputVal] = useState(qParam);
  const [activeTab, setActiveTab] = useState(tabParam);
  const [results, setResults] = useState([]);
  const [peopleResults, setPeopleResults] = useState([]);
  const [didYouMean, setDidYouMean] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync state if URL query changes
  useEffect(() => {
    if (router.isReady) {
      if (qParam !== inputVal) setInputVal(qParam);
      if (tabParam !== activeTab) setActiveTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, tabParam, router.isReady]);

  // Execute search (TMDB for movies/series, AniList for anime)
  useEffect(() => {
    if (!qParam.trim()) {
      setResults([]);
      setPeopleResults([]);
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setLoading(true);

    const isPeople = activeTab === "people";
    const isAnime = activeTab === "anime";

    if (isPeople) {
      fetch(`/api/tmdb/search?q=${encodeURIComponent(qParam)}&type=person`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (!active) return;
          setPeopleResults(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          if (err.name !== "AbortError") {
            console.error("People search error:", err);
            setLoading(false);
          }
        });
    } else if (isAnime) {
      fetch(`/api/anilist/search?q=${encodeURIComponent(qParam)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (!active) return;
          setResults(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          if (err.name !== "AbortError") {
            console.error("AniList search error:", err);
            setLoading(false);
          }
        });
    } else {
      // Tab is "all", "movies", or "series"
      let currentSuggestion = null;
      const tmdbPromise = fetch(`/api/tmdb/search?q=${encodeURIComponent(qParam)}`, { signal: controller.signal })
        .then(async (res) => {
          currentSuggestion = res.headers.get("X-Did-You-Mean");
          const data = res.ok ? await res.json() : [];
          return Array.isArray(data) ? data : data?.results || [];
        })
        .catch(() => []);

      const animePromise =
        activeTab === "all"
          ? fetch(`/api/anilist/search?q=${encodeURIComponent(qParam)}&limit=10`, { signal: controller.signal })
              .then((res) => (res.ok ? res.json() : []))
              .catch(() => [])
          : Promise.resolve([]);

      Promise.all([tmdbPromise, animePromise])
        .then(([tmdbItems, animeItems]) => {
          if (!active) return;
          const cleanTmdb = (Array.isArray(tmdbItems) ? tmdbItems : []).filter((item) => item.type !== "anime");
          const cleanAnime = Array.isArray(animeItems) ? animeItems : [];
          setResults([...cleanTmdb, ...cleanAnime]);
          setDidYouMean(currentSuggestion || null);
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          if (err.name !== "AbortError") {
            console.error("Combined search error:", err);
            setLoading(false);
          }
        });
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [qParam, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) return;
    router.replace(
      { pathname: "/search", query: { q: clean, tab: activeTab } },
      undefined,
      { shallow: true }
    );
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (qParam) {
      router.replace(
        { pathname: "/search", query: { q: qParam, tab: tabId } },
        undefined,
        { shallow: true }
      );
    }
  };

  const clearInput = () => {
    setInputVal("");
    router.replace({ pathname: "/search" }, undefined, { shallow: true });
  };

  // Filter items by active tab
  const displayedTitles = useMemo(() => {
    if (activeTab === "movies") {
      return results.filter((r) => r.type === "movie");
    }
    if (activeTab === "series") {
      return results.filter((r) => r.type === "series");
    }
    if (activeTab === "anime") {
      return results.filter((r) => r.type === "anime");
    }
    return results;
  }, [results, activeTab]);

  return (
    <Layout
      title={qParam ? `${qParam} · Search · DIVINE` : "Search · DIVINE"}
      description="Search movies, TV series, anime and people directly from TMDB."
    >
      <div className={styles.container}>
        {/* Search Input Bar matching Screenshot 2026-11-08 125604.png */}
        <form className={styles.searchBarWrap} onSubmit={handleSearchSubmit}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search movies, series, anime, people…"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            autoFocus
          />
          {inputVal && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={clearInput}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
          <SearchIcon size={20} className={styles.searchIcon} />
        </form>

        {/* Filter Tabs: All | Movies | Series | Anime | People */}
        <div className={styles.tabsRow} role="tablist">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ""}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Did you mean typo notice */}
        {didYouMean && !loading && (
          <div
            style={{
              margin: "0 0 20px",
              padding: "12px 18px",
              borderRadius: "10px",
              background: "rgba(220, 38, 38, 0.1)",
              border: "1px solid rgba(220, 38, 38, 0.25)",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>Showing results for</span>
            <button
              type="button"
              style={{
                background: "transparent",
                border: 0,
                padding: 0,
                color: "#f87171",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: 14,
              }}
              onClick={() => {
                setInputVal(didYouMean);
                router.replace(
                  { pathname: "/search", query: { q: didYouMean, tab: activeTab } },
                  undefined,
                  { shallow: true }
                );
              }}
            >
              {didYouMean}
            </button>
          </div>
        )}

        {/* Content State */}
        {loading ? (
          <SkeletonGrid count={6} wide={true} />
        ) : activeTab === "people" ? (
          peopleResults.length > 0 ? (
            <div className={styles.peopleGrid}>
              {peopleResults.map((person) => (
                <div key={person.id} className={styles.personCard}>
                  <div className={styles.personAvatarWrap}>
                    {person.profile && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.profile}
                        alt=""
                        className={styles.personAvatarImg}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.parentElement?.querySelector(`.${styles.personFallbackAvatar}`);
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    )}
                    <div
                      className={styles.personFallbackAvatar}
                      style={{
                        display: person.profile ? "none" : "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <User size={44} color="rgba(255, 255, 255, 0.4)" />
                    </div>
                  </div>
                  <h3 className={styles.personName}>{person.name}</h3>
                  <span className={styles.personDept}>{person.department || "Acting"}</span>
                  {person.knownFor && (
                    <p className={styles.personKnownFor}>Known for: {person.knownFor}</p>
                  )}
                </div>
              ))}
            </div>
          ) : qParam ? (
            <Empty
              title="No people found"
              text={`No actors, directors or creators match “${qParam}”.`}
            />
          ) : null
        ) : displayedTitles.length > 0 ? (
          <div className={styles.resultsList}>
            {displayedTitles.map((item) => (
              <Link
                key={item.id}
                href={`/title/${item.id}`}
                className={styles.resultCard}
              >
                <div className={styles.thumbWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.backdrop || item.poster}
                    alt={item.title}
                    className={styles.thumbImg}
                    loading="lazy"
                  />
                </div>
                <div className={styles.infoCol}>
                  <h2 className={styles.cardTitle}>{item.title}</h2>
                  <div className={styles.cardMeta}>
                    {item.year && <span>{item.year}</span>}
                    {item.year && <span>·</span>}
                    <span style={{ textTransform: "capitalize" }}>
                      {item.type === "movie" ? "Movie" : item.type === "anime" ? "Anime" : "Series"}
                    </span>
                  </div>
                  {item.rating > 0 && (
                    <div className={styles.ratingRow}>
                      <span className={styles.rating}>★ {item.rating}</span>
                    </div>
                  )}
                  <p className={styles.overview}>{item.overview}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : qParam ? (
          <Empty
            title="No titles found"
            text={`No results matched “${qParam}”. Try checking spelling or searching for something else.`}
          />
        ) : (
          <Empty
            title="Search DIVINE"
            text="Type any movie, TV series, anime, or person above to explore titles from TMDB."
          />
        )}
      </div>
    </Layout>
  );
}
