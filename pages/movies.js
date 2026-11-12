import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import TileRow from "../components/TileRow";
import { CatalogFilterBar, TitleGrid, Empty } from "../components/Page";
import { SkeletonHero, SkeletonGrid, SkeletonRow } from "../components/Skeleton";
import { STUDIOS, SERVICES, LANGUAGES, BRAND } from "../lib/constants";

export async function getStaticProps() {
  return {
    props: {},
    revalidate: 1800,
  };
}

const CATEGORIES = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "top", label: "Top Rated" },
  { value: "now_playing", label: "Now Playing" },
  { value: "upcoming", label: "Upcoming" },
];

const STANDARD_GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "War",
  "Western",
];

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "IN", label: "India" },
  { value: "AU", label: "Australia" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
];

const YEARS = [
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2020s",
  "2010s",
  "Earlier",
];

export default function Movies() {
  const router = useRouter();
  const gridRef = useRef(null);
  const infiniteTriggerRef = useRef(null);
  const isInitialMount = useRef(true);

  const [category, setCategory] = useState("trending");
  const [filters, setFilters] = useState({
    genre: "all",
    country: "all",
    year: "all",
    service: "all",
    language: "all",
    rating: "all",
  });
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Pagination & Infinite Scroll states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Dynamic state loaded from TMDB API
  const [heroItems, setHeroItems] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);

  const [moviesList, setMoviesList] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);

  const [topMovies, setTopMovies] = useState([]);
  const [topLoading, setTopLoading] = useState(true);

  // Sync state from URL query on initial load or back/forward navigation
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (q.category && typeof q.category === "string" && q.category !== category) {
      setCategory(q.category);
    }
    setFilters({
      genre: typeof q.genre === "string" ? q.genre : "all",
      country: typeof q.country === "string" ? q.country : "all",
      year: typeof q.year === "string" ? q.year : "all",
      service: typeof q.service === "string" ? q.service : "all",
      language: typeof q.language === "string" ? q.language : "all",
      rating: typeof q.rating === "string" ? q.rating : "all",
    });
    isInitialMount.current = false;
  }, [router.isReady, router.query]);

  // 1. Fetch featured hero banner movies from TMDB API (trending movies)
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=trending&type=movie")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setHeroItems(data.slice(0, 5));
          setHeroLoading(false);
        }
      })
      .catch(() => {
        if (active) setHeroLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // 2. Fetch Top 10 Rated movies from TMDB API
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=top&type=movie")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setTopMovies(data.slice(0, 10));
          setTopLoading(false);
        }
      })
      .catch(() => {
        if (active) setTopLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // 3. Reset pagination when category or filters change
  const prevFiltersRef = useRef({ category, ...filters });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.category !== category ||
      prev.genre !== filters.genre ||
      prev.country !== filters.country ||
      prev.year !== filters.year ||
      prev.service !== filters.service ||
      prev.language !== filters.language ||
      prev.rating !== filters.rating
    ) {
      prevFiltersRef.current = { category, ...filters };
      setPage(1);
      setHasMore(true);
      setMoviesList([]);
    }
  }, [category, filters]);

  // 4. Fetch catalog movies based on selected category, filters, and page
  useEffect(() => {
    let active = true;
    if (page === 1) {
      setMoviesLoading(true);
    } else {
      setLoadingMore(true);
    }

    const params = new URLSearchParams({
      type: "movie",
      category,
      genre: filters.genre,
      country: filters.country,
      year: filters.year,
      service: filters.service,
      language: filters.language,
      rating: filters.rating,
      page: String(page),
    });

    fetch(`/api/tmdb/discover?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!active) return;
        const newItems = Array.isArray(data) ? data : [];
        if (newItems.length < 10) {
          setHasMore(false);
        }
        if (page === 1) {
          setMoviesList(newItems);
          setMoviesLoading(false);
        } else {
          setMoviesList((prev) => {
            const seen = new Set(prev.map((t) => String(t.id || t.tmdbId)));
            const distinct = newItems.filter((t) => !seen.has(String(t.id || t.tmdbId)));
            return [...prev, ...distinct];
          });
          setLoadingMore(false);
        }
      })
      .catch(() => {
        if (!active) return;
        if (page === 1) {
          setMoviesList([]);
          setMoviesLoading(false);
        } else {
          setLoadingMore(false);
          setHasMore(false);
        }
      });

    return () => {
      active = false;
    };
  }, [category, filters, page]);

  // 5. Infinite scroll observer
  useEffect(() => {
    if (!hasMore || moviesLoading || loadingMore) return;
    const trigger = infiniteTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !moviesLoading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, moviesLoading, loadingMore]);

  // Dropdown filter options strictly ordered as in reference screenshot
  const filterOptions = useMemo(() => {
    return {
      genre: STANDARD_GENRES.map((g) => ({ value: g, label: g })),
      country: COUNTRIES,
      year: YEARS.map((y) => ({ value: y, label: y })),
      service: SERVICES.map((s) => ({ value: s.id, label: s.name })),
      language: LANGUAGES,
      rating: [
        { value: "8", label: "★ 8.0+" },
        { value: "7", label: "★ 7.0+" },
        { value: "6", label: "★ 6.0+" },
      ],
    };
  }, []);

  const updateUrl = (newCat, newFilters) => {
    const next = {};
    if (newCat && newCat !== "trending") next.category = newCat;
    for (const [k, v] of Object.entries(newFilters)) {
      if (v && v !== "all") next[k] = v;
    }
    router.replace({ pathname: "/movies", query: next }, undefined, { shallow: true });
    if (!isInitialMount.current && gridRef.current) {
      const top = gridRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    updateUrl(val, filters);
  };

  const handleFilterChange = (key, val) => {
    const nextFilters = { ...filters, [key]: val };
    setFilters(nextFilters);
    updateUrl(category, nextFilters);
  };

  const handleShuffle = () => {
    setShuffleSeed((s) => s + 1);
  };

  const displayedMovies = useMemo(() => {
    if (!moviesList || moviesList.length === 0) return [];
    if (shuffleSeed > 0) {
      return [...moviesList].sort(() => Math.sin(shuffleSeed * 9999 + 1) - 0.5);
    }
    return moviesList;
  }, [moviesList, shuffleSeed]);

  return (
    <Layout
      flush
      title="Movies"
      description={`Movies on ${BRAND.name}: stream top rated, new releases and trending blockbusters directly from TMDB.`}
    >
      {heroLoading ? (
        <SkeletonHero />
      ) : heroItems.length > 0 ? (
        <HeroBanner items={heroItems} />
      ) : null}

      <section
        ref={gridRef}
        style={{
          padding: "36px var(--page-pad) 64px",
          maxWidth: "var(--page-max)",
          margin: "0 auto",
        }}
      >
        <CatalogFilterBar
          title="Movies"
          category={category}
          onCategoryChange={handleCategoryChange}
          categories={CATEGORIES}
          filters={filters}
          onFilterChange={handleFilterChange}
          filterOptions={filterOptions}
          onShuffle={handleShuffle}
        />

        {moviesLoading ? (
          <SkeletonGrid count={15} wide={true} />
        ) : displayedMovies.length > 0 ? (
          <>
            <TitleGrid items={displayedMovies} wide={true} />

            {/* Infinite Scroll Trigger & Indicator */}
            <div
              ref={infiniteTriggerRef}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "36px 0 16px",
                minHeight: "60px",
              }}
            >
              {loadingMore && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      border: "2px solid rgba(255, 255, 255, 0.2)",
                      borderTopColor: "#ffffff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  <span>Loading more movies...</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <Empty
            title="No movies found"
            text="No movies match your selected TMDB filters. Try resetting genre or year."
          />
        )}
      </section>

      {topLoading ? (
        <SkeletonRow title="Top 10 Movies" count={6} wide={true} />
      ) : topMovies.length > 0 ? (
        <MediaRow title="Top 10 Movies">
          {topMovies.map((t, i) => (
            <MediaCard key={t.id || t.tmdbId} title={t} rank={i + 1} />
          ))}
        </MediaRow>
      ) : null}

      <TileRow title="Browse by studio" items={STUDIOS} param="studio" />
    </Layout>
  );
}
