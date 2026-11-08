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
  const queryReady = useRef(false);
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

  // Dynamic state loaded strictly from TMDB API
  const [heroItems, setHeroItems] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);

  const [moviesList, setMoviesList] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);

  const [topMovies, setTopMovies] = useState([]);
  const [topLoading, setTopLoading] = useState(true);

  // Shared catalog URLs must restore the exact selected view on a fresh load.
  useEffect(() => {
    if (!router.isReady || queryReady.current) return;
    const nextCategory = CATEGORIES.some((item) => item.value === router.query.category)
      ? router.query.category
      : "trending";
    const read = (key) => {
      const value = router.query[key];
      return typeof value === "string" && value.length <= 50 ? value : "all";
    };
    setCategory(nextCategory);
    setFilters({
      genre: read("genre"),
      country: read("country"),
      year: read("year"),
      service: read("service"),
      language: read("language"),
      rating: read("rating"),
    });
    queryReady.current = true;
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!router.isReady || !queryReady.current) return;
    const query = {};
    if (category !== "trending") query.category = category;
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") query[key] = value;
    });
    const current = new URLSearchParams(
      Object.entries(router.query).flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value]] : []
      )
    ).toString();
    const next = new URLSearchParams(query).toString();
    if (current !== next) {
      router.replace({ pathname: "/movies", query }, undefined, { shallow: true, scroll: false });
    }
  }, [category, filters, router]);

  const scrollToGrid = () => {
    window.requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
    scrollToGrid();
  };

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

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    scrollToGrid();
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
          scrollMarginTop: 84,
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
