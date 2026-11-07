import { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import TileRow from "../components/TileRow";
import { CatalogFilterBar, TitleGrid, Empty } from "../components/Page";
import {
  MOVIE_HERO_IDS,
  getTitle,
  topMovies,
  trendingMovies,
  popularMovies,
  STUDIOS,
  SERVICES,
  ofType,
  BRAND,
} from "../lib/data";

const movieHeroItems = MOVIE_HERO_IDS.map(getTitle).filter(Boolean);
const allMovies = ofType("movie");

const CATEGORIES = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "top", label: "Top Rated" },
  { value: "now_playing", label: "Now Playing" },
  { value: "upcoming", label: "Upcoming" },
];

export default function Movies() {
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
  const [liveList, setLiveList] = useState(null);

  useEffect(() => {
    let active = true;
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
        if (active && Array.isArray(data) && data.length > 0) {
          setLiveList(data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [category, filters]);

  const filterOptions = useMemo(() => {
    const genres = [
      ...new Set(allMovies.flatMap((t) => t.genres || [])),
    ].sort();
    const countries = [
      ...new Set(allMovies.map((t) => t.country).filter(Boolean)),
    ].sort();
    const years = [
      "2026",
      "2025",
      "2024",
      "2023",
      "2022",
      "2020s",
      "2010s",
      "Earlier",
    ];
    const services = SERVICES.map((s) => ({ value: s.id, label: s.name }));
    const languages = [
      ...new Set(allMovies.map((t) => t.language).filter(Boolean)),
    ].sort();

    return {
      genre: genres.map((g) => ({ value: g, label: g })),
      country: countries.map((c) => ({ value: c, label: c })),
      year: years.map((y) => ({ value: y, label: y })),
      service: services,
      language: languages.map((l) => ({ value: l, label: l })),
      rating: [
        { value: "8", label: "★ 8.0+" },
        { value: "7", label: "★ 7.0+" },
        { value: "6", label: "★ 6.0+" },
      ],
    };
  }, []);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleShuffle = () => {
    setShuffleSeed((s) => s + 1);
  };

  const shown = useMemo(() => {
    let list = [];
    if (category === "trending") {
      const rest = allMovies.filter((m) => !trendingMovies.some((t) => t.id === m.id));
      list = [...trendingMovies, ...rest];
    } else if (category === "popular") {
      const rest = allMovies.filter((m) => !popularMovies.some((t) => t.id === m.id));
      list = [...popularMovies, ...rest];
    } else if (category === "top") {
      list = [...allMovies].sort((a, b) => b.rating - a.rating);
    } else if (category === "now_playing") {
      list = allMovies.filter((m) => m.year >= 2024 && m.status !== "upcoming");
    } else if (category === "upcoming") {
      list = allMovies.filter((m) => m.year >= 2026 || m.status === "upcoming");
    } else {
      list = [...allMovies];
    }

    if (filters.genre !== "all") {
      list = list.filter((t) => (t.genres || []).includes(filters.genre));
    }
    if (filters.country !== "all") {
      list = list.filter((t) => t.country === filters.country);
    }
    if (filters.year !== "all") {
      if (filters.year === "2020s") list = list.filter((t) => t.year >= 2020);
      else if (filters.year === "2010s") list = list.filter((t) => t.year >= 2010 && t.year < 2020);
      else if (filters.year === "Earlier") list = list.filter((t) => t.year < 2010);
      else list = list.filter((t) => String(t.year) === filters.year);
    }
    if (filters.service !== "all") {
      list = list.filter((t) => t.service === filters.service);
    }
    if (filters.language !== "all") {
      list = list.filter((t) => t.language === filters.language);
    }
    if (filters.rating !== "all") {
      const min = Number(filters.rating);
      list = list.filter((t) => (t.rating || 0) >= min);
    }

    if (shuffleSeed > 0) {
      list = [...list].sort(() => Math.sin(shuffleSeed * 9999 + 1) - 0.5);
    }

    return list;
  }, [category, filters, shuffleSeed]);

  return (
    <Layout
      flush
      title="Movies"
      description={`Movies on ${BRAND.name}: stream top rated, new releases and trending blockbusters.`}
    >
      <HeroBanner items={movieHeroItems} />

      <section
        style={{
          padding: "36px var(--page-pad) 64px",
          maxWidth: "var(--page-max)",
          margin: "0 auto",
        }}
      >
        <CatalogFilterBar
          title="Movies"
          category={category}
          onCategoryChange={setCategory}
          categories={CATEGORIES}
          filters={filters}
          onFilterChange={handleFilterChange}
          filterOptions={filterOptions}
          onShuffle={handleShuffle}
        />

        {(liveList || shown).length ? (
          <TitleGrid items={liveList || shown} wide={true} />
        ) : (
          <Empty
            title="No movies found"
            text="No movies match your selected filters. Try resetting genre or year."
          />
        )}
      </section>

      <MediaRow title="Top 10 Movies">
        {topMovies.map((t, i) => (
          <MediaCard key={t.id} title={t} rank={i + 1} />
        ))}
      </MediaRow>

      <TileRow title="Browse by studio" items={STUDIOS} param="studio" />
    </Layout>
  );
}
