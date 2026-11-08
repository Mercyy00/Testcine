import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import TileRow from "../components/TileRow";
import { CatalogFilterBar, TitleGrid, Empty, Chips } from "../components/Page";
import { SkeletonHero, SkeletonGrid, SkeletonRow } from "../components/Skeleton";
import { SERVICES, BRAND } from "../lib/constants";

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

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
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
    if (q.category && typeof q.category === "string") {
      setCategory(q.category);
    }
    if (q.network && typeof q.network === "string") {
      setNetwork(q.network);
    }
    setFilters((prev) => ({
      genre: typeof q.genre === "string" ? q.genre : prev.genre,
      country: typeof q.country === "string" ? q.country : prev.country,
      year: typeof q.year === "string" ? q.year : prev.year,
      service: typeof q.service === "string" ? q.service : prev.service,
      language: typeof q.language === "string" ? q.language : prev.language,
      rating: typeof q.rating === "string" ? q.rating : prev.rating,
    }));
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

  // 3. Fetch catalog series from TMDB API based on category & filters & network
  useEffect(() => {
    let active = true;
    setSeriesLoading(true);

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
    });
    if (network && network !== "all") {
      params.set("network", network);
    }

    fetch(`/api/tmdb/discover?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) {
          setSeriesList(Array.isArray(data) ? data : []);
          setSeriesLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setSeriesList([]);
          setSeriesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [category, network, filters]);

  const filterOptions = useMemo(() => {
    const services = SERVICES.map((s) => ({ value: s.id, label: s.name }));

    return {
      genre: STANDARD_GENRES.map((g) => ({ value: g, label: g })),
      country: COUNTRIES,
      year: YEARS.map((y) => ({ value: y, label: y })),
      service: services,
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
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <SkeletonGrid count={12} wide={true} />
        ) : displayedSeries.length > 0 ? (
          <TitleGrid items={displayedSeries} wide={true} />
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
