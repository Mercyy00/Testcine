import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import TileRow from "../components/TileRow";
import { CatalogFilterBar, TitleGrid, Empty } from "../components/Page";
import { SkeletonHero, SkeletonGrid, SkeletonRow } from "../components/Skeleton";
import { STUDIOS, SERVICES, BRAND, GENRE_MAP } from "../lib/constants";

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

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "hi", label: "Hindi" },
  { value: "it", label: "Italian" },
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

  // Sync state from URL query on initial load or back/forward navigation
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (q.category && typeof q.category === "string") {
      setCategory(q.category);
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

  // Dynamic state loaded strictly from TMDB API
  const [heroItems, setHeroItems] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);

  const [moviesList, setMoviesList] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);

  const [topMovies, setTopMovies] = useState([]);
  const [topLoading, setTopLoading] = useState(true);

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

  // 3. Fetch catalog movies based on selected category & filters from TMDB API
  useEffect(() => {
    let active = true;
    setMoviesLoading(true);

    const params = new URLSearchParams({
      type: "movie",
      category,
      genre: filters.genre,
      country: filters.country,
      year: filters.year,
      service: filters.service,
      language: filters.language,
      rating: filters.rating,
    });

    fetch(`/api/tmdb/discover?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) {
          setMoviesList(Array.isArray(data) ? data : []);
          setMoviesLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setMoviesList([]);
          setMoviesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [category, filters]);

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

  const updateUrl = (newCat, newFilters) => {
    const next = {};
    if (newCat && newCat !== "trending") next.category = newCat;
    for (const [k, v] of Object.entries(newFilters)) {
      if (v && v !== "all") next[k] = v;
    }
    router.replace({ pathname: "/movies", query: next }, undefined, { shallow: true });
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <SkeletonGrid count={12} wide={true} />
        ) : displayedMovies.length > 0 ? (
          <TitleGrid items={displayedMovies} wide={true} />
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
