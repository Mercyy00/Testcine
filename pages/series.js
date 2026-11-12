import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import TileRow from "../components/TileRow";
import { CatalogFilterBar, TitleGrid, Empty, Chips } from "../components/Page";
import { SkeletonHero, SkeletonGrid, SkeletonRow } from "../components/Skeleton";
import { SERVICES, LANGUAGES, BRAND } from "../lib/constants";

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
  { value: "airing_today", label: "Airing Today" },
  { value: "on_air", label: "On Air" },
];

const NETWORKS = [
  { value: "all", label: "All Networks" },
  { value: "49", label: "HBO" },
  { value: "213", label: "Netflix" },
  { value: "174", label: "AMC" },
  { value: "2552", label: "Apple TV+" },
  { value: "67", label: "Showtime" },
  { value: "88", label: "FX" },
  { value: "3353", label: "Peacock" },
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
  "Kids",
  "Mystery",
  "Sci-Fi",
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
  { value: "ES", label: "Spain" },
  { value: "AU", label: "Australia" },
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

export default function Series() {
  const router = useRouter();
  const gridRef = useRef(null);
  const infiniteTriggerRef = useRef(null);
  const isInitialMount = useRef(true);

  const [category, setCategory] = useState("trending");
  const [network, setNetwork] = useState("all");
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

  // Dynamic TMDB API state
  const [heroItems, setHeroItems] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);

  const [seriesList, setSeriesList] = useState([]);
  const [seriesLoading, setSeriesLoading] = useState(true);

  const [topSeries, setTopSeries] = useState([]);
  const [topLoading, setTopLoading] = useState(true);

  // Sync state from URL query on initial load or back/forward navigation
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (q.category && typeof q.category === "string" && q.category !== category) {
      setCategory(q.category);
    }
    if (q.network && typeof q.network === "string" && q.network !== network) {
      setNetwork(q.network);
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

  // 1. Fetch featured hero banner series from TMDB API
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=trending&type=tv")
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

  // 2. Fetch Top 10 series from TMDB API
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=top&type=tv")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setTopSeries(data.slice(0, 10));
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

  // 3. Reset pagination when category, network, or filters change
  const prevFiltersRef = useRef({ category, network, ...filters });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.category !== category ||
      prev.network !== network ||
      prev.genre !== filters.genre ||
      prev.country !== filters.country ||
      prev.year !== filters.year ||
      prev.service !== filters.service ||
      prev.language !== filters.language ||
      prev.rating !== filters.rating
    ) {
      prevFiltersRef.current = { category, network, ...filters };
      setPage(1);
      setHasMore(true);
      setSeriesList([]);
    }
  }, [category, network, filters]);

  // 4. Fetch catalog series from TMDB API based on category, filters, network, and page
  useEffect(() => {
    let active = true;
    if (page === 1) {
      setSeriesLoading(true);
    } else {
      setLoadingMore(true);
    }

    const catMap = {
      trending: "trending",
      popular: "popular",
      top: "top",
      airing_today: "airing_today",
      on_air: "on_the_air",
    };

    const params = new URLSearchParams({
      type: "tv",
      category: catMap[category] || category,
      genre: filters.genre,
      country: filters.country,
      year: filters.year,
      service: filters.service,
      language: filters.language,
      rating: filters.rating,
      page: String(page),
    });
    if (network && network !== "all") {
      params.set("network", network);
    }

    fetch(`/api/tmdb/discover?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!active) return;
        const newItems = Array.isArray(data) ? data : [];
        if (newItems.length < 10) {
          setHasMore(false);
        }
        if (page === 1) {
          setSeriesList(newItems);
          setSeriesLoading(false);
        } else {
          setSeriesList((prev) => {
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
          setSeriesList([]);
          setSeriesLoading(false);
        } else {
          setLoadingMore(false);
          setHasMore(false);
        }
      });

    return () => {
      active = false;
    };
  }, [category, network, filters, page]);

  // 5. Infinite scroll observer
  useEffect(() => {
    if (!hasMore || seriesLoading || loadingMore) return;
    const trigger = infiniteTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !seriesLoading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, seriesLoading, loadingMore]);

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

  const updateUrl = (newCat, newNet, newFilters) => {
    const next = {};
    if (newCat && newCat !== "trending") next.category = newCat;
    if (newNet && newNet !== "all") next.network = newNet;
    for (const [k, v] of Object.entries(newFilters)) {
      if (v && v !== "all") next[k] = v;
    }
    router.replace({ pathname: "/series", query: next }, undefined, { shallow: true });
    if (!isInitialMount.current && gridRef.current) {
      const top = gridRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    updateUrl(val, network, filters);
  };

  const handleNetworkChange = (val) => {
    setNetwork(val);
    updateUrl(category, val, filters);
  };

  const handleFilterChange = (key, val) => {
    const nextFilters = { ...filters, [key]: val };
    setFilters(nextFilters);
    updateUrl(category, network, nextFilters);
  };

  const handleShuffle = () => {
    setShuffleSeed((s) => s + 1);
  };

  const displayedSeries = useMemo(() => {
    if (!seriesList || seriesList.length === 0) return [];
    if (shuffleSeed > 0) {
      return [...seriesList].sort(() => Math.sin(shuffleSeed * 9999 + 1) - 0.5);
    }
    return seriesList;
  }, [seriesList, shuffleSeed]);

  return (
    <Layout
      flush
      title="Series"
      description={`TV Series on ${BRAND.name}: stream binge-worthy dramas, thrillers and comedy directly from TMDB.`}
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
          title="Series"
          category={category}
          onCategoryChange={handleCategoryChange}
          categories={CATEGORIES}
          filters={filters}
          onFilterChange={handleFilterChange}
          filterOptions={filterOptions}
          onShuffle={handleShuffle}
        />

        <div style={{ marginBottom: 24, marginTop: 16 }}>
          <Chips
            label="Network"
            options={NETWORKS}
            value={network}
            onChange={handleNetworkChange}
          />
        </div>

        {seriesLoading ? (
          <SkeletonGrid count={15} wide={true} />
        ) : displayedSeries.length > 0 ? (
          <>
            <TitleGrid items={displayedSeries} wide={true} />

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
                  <span>Loading more series...</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <Empty
            title="No series found"
            text="No TV series match your selected TMDB filters. Try another genre or year."
          />
        )}
      </section>

      {topLoading ? (
        <SkeletonRow title="Top 10 Series" count={6} wide={true} />
      ) : topSeries.length > 0 ? (
        <MediaRow title="Top 10 Series">
          {topSeries.map((t, i) => (
            <MediaCard key={t.id || t.tmdbId} title={t} rank={i + 1} />
          ))}
        </MediaRow>
      ) : null}

      <TileRow title="Browse by service" items={SERVICES} param="service" />
    </Layout>
  );
}
