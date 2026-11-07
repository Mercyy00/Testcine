import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import { CatalogFilterBar, TitleGrid, Empty } from "../components/Page";
import { SkeletonHero, SkeletonGrid, SkeletonRow } from "../components/Skeleton";
import { BRAND } from "../lib/constants";
import styles from "../styles/Anime.module.css";

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
  { value: "simulcasts", label: "Simulcasts" },
];

const STANDARD_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Mystery",
  "Romance",
  "Sci-Fi",
];

const YEARS = ["2026", "2025", "2024", "2023", "2022", "2010s", "Earlier"];

export default function Anime() {
  const [category, setCategory] = useState("trending");
  const [filters, setFilters] = useState({
    genre: "all",
    year: "all",
    rating: "all",
  });
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Dynamic TMDB state
  const [heroItems, setHeroItems] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);

  const [topItems, setTopItems] = useState([]);
  const [topLoading, setTopLoading] = useState(true);

  const [trendingItems, setTrendingItems] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [animeList, setAnimeList] = useState([]);
  const [animeLoading, setAnimeLoading] = useState(true);

  // 1. Fetch featured hero banner anime from TMDB API
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=trending&type=anime")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setHeroItems(data.slice(0, 5));
          setTrendingItems(data.slice(0, 10));
          setHeroLoading(false);
          setTrendingLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setHeroLoading(false);
          setTrendingLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // 2. Fetch Top rated anime from TMDB API
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=top&type=anime")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setTopItems(data.slice(0, 10));
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

  // 3. Fetch catalog anime from TMDB API based on category & filters
  useEffect(() => {
    let active = true;
    setAnimeLoading(true);

    const catMap = {
      trending: "trending",
      popular: "popular",
      top: "top",
      simulcasts: "airing_today",
    };

    const params = new URLSearchParams({
      type: "anime",
      category: catMap[category] || category,
      genre: filters.genre,
      year: filters.year,
      rating: filters.rating,
    });

    fetch(`/api/tmdb/discover?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) {
          setAnimeList(Array.isArray(data) ? data : []);
          setAnimeLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setAnimeList([]);
          setAnimeLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [category, filters]);

  const filterOptions = useMemo(() => {
    return {
      genre: STANDARD_GENRES.map((g) => ({ value: g, label: g })),
      year: YEARS.map((y) => ({ value: y, label: y })),
      rating: [
        { value: "8", label: "★ 8.0+" },
        { value: "7", label: "★ 7.0+" },
      ],
    };
  }, []);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleShuffle = () => {
    setShuffleSeed((s) => s + 1);
  };

  const displayedAnime = useMemo(() => {
    if (!animeList || animeList.length === 0) return [];
    if (shuffleSeed > 0) {
      return [...animeList].sort(() => Math.sin(shuffleSeed * 9999 + 1) - 0.5);
    }
    return animeList;
  }, [animeList, shuffleSeed]);

  return (
    <Layout
      flush
      title="Anime"
      description={`Anime on ${BRAND.name}: simulcasts, top rated shonen, seinen and fantasy streaming directly from TMDB.`}
    >
      {heroLoading ? (
        <SkeletonHero />
      ) : heroItems.length > 0 ? (
        <HeroBanner items={heroItems} />
      ) : null}

      <div className={styles.mainLayout}>
        <div className={styles.contentColumn}>
          {topLoading ? (
            <SkeletonRow title="Top 10 Anime" count={5} wide={true} />
          ) : topItems.length > 0 ? (
            <MediaRow title="Top 10 Anime">
              {topItems.map((t, i) => (
                <MediaCard
                  key={t.id || t.tmdbId}
                  title={t}
                  badge={t.badge || `★ ${t.rating}`}
                />
              ))}
            </MediaRow>
          ) : null}

          {trendingLoading ? (
            <SkeletonRow title="Trending now" count={5} wide={true} />
          ) : trendingItems.length > 0 ? (
            <MediaRow title="Trending now">
              {trendingItems.map((t) => (
                <MediaCard
                  key={t.id || t.tmdbId}
                  title={t}
                  badge={t.badge || "Trending"}
                />
              ))}
            </MediaRow>
          ) : null}

          <section style={{ marginTop: 12 }}>
            <CatalogFilterBar
              title="All Anime"
              category={category}
              onCategoryChange={setCategory}
              categories={CATEGORIES}
              filters={filters}
              onFilterChange={handleFilterChange}
              filterOptions={filterOptions}
              onShuffle={handleShuffle}
            />

            {animeLoading ? (
              <SkeletonGrid count={12} wide={true} />
            ) : displayedAnime.length > 0 ? (
              <TitleGrid items={displayedAnime} wide={true} />
            ) : (
              <Empty
                title="No anime found"
                text="No anime match your selected TMDB filters. Try another genre."
              />
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
