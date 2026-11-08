import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import { CatalogFilterBar, TitleGrid, Empty, Chips } from "../components/Page";
import { SkeletonHero, SkeletonGrid, SkeletonRow } from "../components/Skeleton";
import { BRAND } from "../lib/constants";
import { fetchAniListDiscover } from "../lib/anilist";
import styles from "../styles/Anime.module.css";

export async function getStaticProps() {
  try {
    const [heroData, topData] = await Promise.all([
      fetchAniListDiscover({ category: "trending", perPage: 10 }),
      fetchAniListDiscover({ category: "top", perPage: 10 }),
    ]);
    return {
      props: {
        initialHero: heroData ? heroData.slice(0, 5) : [],
        initialTrending: heroData ? heroData.slice(0, 10) : [],
        initialTop: topData || [],
      },
      revalidate: 1800,
    };
  } catch {
    return {
      props: {},
      revalidate: 60,
    };
  }
}

const CATEGORIES = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "top", label: "Top Rated" },
  { value: "simulcasts", label: "Simulcasts" },
];

const ANIME_STUDIOS = [
  { value: "all", label: "All Studios" },
  { value: "MAPPA", label: "MAPPA" },
  { value: "ufotable", label: "Ufotable" },
  { value: "Wit Studio", label: "Wit Studio" },
  { value: "A-1 Pictures", label: "A-1 Pictures" },
  { value: "Sunrise", label: "Sunrise" },
  { value: "Kyoto Animation", label: "Kyoto Animation" },
  { value: "Bones", label: "Bones" },
  { value: "Madhouse", label: "Madhouse" },
  { value: "CloverWorks", label: "CloverWorks" },
];

const ANIME_SUBGENRES = [
  { value: "all", label: "All Sub-genres" },
  { value: "Isekai", label: "Isekai" },
  { value: "Mecha", label: "Mecha" },
  { value: "Shounen", label: "Shounen" },
  { value: "Slice of Life", label: "Slice of Life" },
  { value: "Psychological", label: "Psychological" },
  { value: "Cyberpunk", label: "Cyberpunk" },
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
  "Supernatural",
  "Sports",
];

const YEARS = ["2026", "2025", "2024", "2023", "2022", "2010s", "Earlier"];

export default function Anime({ initialHero = [], initialTrending = [], initialTop = [] }) {
  const router = useRouter();
  const gridRef = useRef(null);

  const [category, setCategory] = useState("trending");
  const [studio, setStudio] = useState("all");
  const [subgenre, setSubgenre] = useState("all");
  const [filters, setFilters] = useState({
    genre: "all",
    year: "all",
    rating: "all",
  });
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Dynamic AniList state
  const [heroItems, setHeroItems] = useState(initialHero);
  const [heroLoading, setHeroLoading] = useState(initialHero.length === 0);

  const [topItems, setTopItems] = useState(initialTop);
  const [topLoading, setTopLoading] = useState(initialTop.length === 0);

  const [trendingItems, setTrendingItems] = useState(initialTrending);
  const [trendingLoading, setTrendingLoading] = useState(initialTrending.length === 0);

  const [animeList, setAnimeList] = useState([]);
  const [animeLoading, setAnimeLoading] = useState(true);

  // Sync state from URL query on initial load or back/forward navigation
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (q.category && typeof q.category === "string") {
      setCategory(q.category);
    }
    if (q.studio && typeof q.studio === "string") {
      setStudio(q.studio);
    }
    if (q.subgenre && typeof q.subgenre === "string") {
      setSubgenre(q.subgenre);
    } else if (q.keywords && typeof q.keywords === "string") {
      setSubgenre(q.keywords);
    }
    setFilters((prev) => ({
      genre: typeof q.genre === "string" ? q.genre : prev.genre,
      year: typeof q.year === "string" ? q.year : prev.year,
      rating: typeof q.rating === "string" ? q.rating : prev.rating,
    }));
  }, [router.isReady, router.query]);

  // 1. Fetch featured hero banner anime & trending from AniList API if not preloaded
  useEffect(() => {
    let active = true;
    fetch("/api/anilist/discover?category=trending&limit=10")
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

  // 2. Fetch Top rated anime from AniList API if not preloaded
  useEffect(() => {
    let active = true;
    fetch("/api/anilist/discover?category=top&limit=10")
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

  // 3. Fetch catalog anime from AniList API based on category, studio, subgenre & filters
  useEffect(() => {
    let active = true;
    setAnimeLoading(true);

    const params = new URLSearchParams({
      category,
      genre: filters.genre,
      year: filters.year,
      rating: filters.rating,
    });
    if (studio && studio !== "all") {
      params.set("studio", studio);
    }
    if (subgenre && subgenre !== "all") {
      params.set("subgenre", subgenre);
    }

    fetch(`/api/anilist/discover?${params.toString()}`)
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
  }, [category, studio, subgenre, filters]);

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

  const updateUrl = (newCat, newStudio, newSubgenre, newFilters) => {
    const next = {};
    if (newCat && newCat !== "trending") next.category = newCat;
    if (newStudio && newStudio !== "all") next.studio = newStudio;
    if (newSubgenre && newSubgenre !== "all") next.subgenre = newSubgenre;
    for (const [k, v] of Object.entries(newFilters)) {
      if (v && v !== "all") next[k] = v;
    }
    router.replace({ pathname: "/anime", query: next }, undefined, { shallow: true });
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    updateUrl(val, studio, subgenre, filters);
  };

  const handleStudioChange = (val) => {
    setStudio(val);
    updateUrl(category, val, subgenre, filters);
  };

  const handleSubgenreChange = (val) => {
    setSubgenre(val);
    updateUrl(category, studio, val, filters);
  };

  const handleFilterChange = (key, val) => {
    const nextFilters = { ...filters, [key]: val };
    setFilters(nextFilters);
    updateUrl(category, studio, subgenre, nextFilters);
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
      description={`Anime on ${BRAND.name}: simulcasts, top rated shonen, seinen and fantasy streaming directly from AniList.`}
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
              {topItems.map((t) => (
                <MediaCard
                  key={t.id || t.anilistId}
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
                  key={t.id || t.anilistId}
                  title={t}
                  badge={t.badge || "Trending"}
                />
              ))}
            </MediaRow>
          ) : null}

          <section ref={gridRef} style={{ marginTop: 12 }}>
            <CatalogFilterBar
              title="All Anime"
              category={category}
              onCategoryChange={handleCategoryChange}
              categories={CATEGORIES}
              filters={filters}
              onFilterChange={handleFilterChange}
              filterOptions={filterOptions}
              onShuffle={handleShuffle}
            />

            <div style={{ display: "grid", gap: 12, marginTop: 16, marginBottom: 24 }}>
              <Chips
                label="Studio"
                options={ANIME_STUDIOS}
                value={studio}
                onChange={handleStudioChange}
              />
              <Chips
                label="Sub-genre"
                options={ANIME_SUBGENRES}
                value={subgenre}
                onChange={handleSubgenreChange}
              />
            </div>

            {animeLoading ? (
              <SkeletonGrid count={12} wide={true} />
            ) : displayedAnime.length > 0 ? (
              <TitleGrid items={displayedAnime} wide={true} />
            ) : (
              <Empty
                title="No anime found"
                text="No anime match your selected AniList filters. Try another genre."
              />
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
