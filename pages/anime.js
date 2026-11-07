import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import { CatalogFilterBar, TitleGrid, Empty } from "../components/Page";
import {
  ANIME_HERO_IDS,
  getTitle,
  topAnime,
  trendingAnime,
  popularAnime,
  topAiringAnime,
  SERVICES,
  ofType,
  BRAND,
} from "../lib/data";
import styles from "../styles/Anime.module.css";

const animeHeroItems = ANIME_HERO_IDS.map(getTitle).filter(Boolean);
const allAnime = ofType("anime");

const CATEGORIES = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "top", label: "Top Rated" },
  { value: "simulcasts", label: "Simulcasts" },
];

export default function Anime() {
  const [category, setCategory] = useState("trending");
  const [filters, setFilters] = useState({
    genre: "all",
    year: "all",
    rating: "all",
  });
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [liveList, setLiveList] = useState(null);

  useEffect(() => {
    let active = true;
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
      ...new Set(allAnime.flatMap((t) => t.genres || [])),
    ].sort();
    const years = ["2026", "2025", "2024", "2023", "2022", "2010s", "Earlier"];

    return {
      genre: genres.map((g) => ({ value: g, label: g })),
      year: years.map((y) => ({ value: y, label: y })),
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

  const shown = useMemo(() => {
    let list = [];
    if (category === "trending") {
      const rest = allAnime.filter((a) => !trendingAnime.some((t) => t.id === a.id));
      list = [...trendingAnime, ...rest];
    } else if (category === "popular") {
      const rest = allAnime.filter((a) => !popularAnime.some((t) => t.id === a.id));
      list = [...popularAnime, ...rest];
    } else if (category === "top") {
      list = [...allAnime].sort((a, b) => b.rating - a.rating);
    } else {
      list = [...allAnime];
    }

    if (filters.genre !== "all") {
      list = list.filter((t) => (t.genres || []).includes(filters.genre));
    }
    if (filters.year !== "all") {
      if (filters.year === "2010s") list = list.filter((t) => t.year >= 2010 && t.year < 2020);
      else if (filters.year === "Earlier") list = list.filter((t) => t.year < 2010);
      else list = list.filter((t) => String(t.year) === filters.year);
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
      title="Anime"
      description={`Anime on ${BRAND.name}: top rated series, movies and seasonal simulcasts.`}
    >
      <HeroBanner items={animeHeroItems} />

      <div className={styles.animeLayout}>
        {/* Main Column */}
        <div className={styles.mainColumn}>
          {/* Top 10 Today matching Image 5 */}
          <MediaRow title="Top 10 Today">
            {topAnime.map((t, i) => (
              <MediaCard
                key={t.id}
                title={t}
                badge={t.badge || `E${(i + 1) * 2} in ${i + 2}d`}
              />
            ))}
          </MediaRow>

          {/* Trending now matching Image 5 */}
          <MediaRow title="Trending now">
            {trendingAnime.map((t, i) => (
              <MediaCard
                key={t.id}
                title={t}
                badge={t.badge || `E${i + 5} in ${i + 1}d`}
              />
            ))}
          </MediaRow>

          {/* All Anime Filter & Grid */}
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

            {(liveList || shown).length ? (
              <TitleGrid items={liveList || shown} wide={true} />
            ) : (
              <Empty
                title="No anime found"
                text="No anime match your selected filters. Try another genre."
              />
            )}
          </section>
        </div>

        {/* Right Sidebar: Top Airing Panel matching Image 5 */}
        <aside className={styles.sidebarColumn}>
          <div className={styles.topAiringPanel}>
            <h2 className={styles.panelTitle}>Top airing</h2>
            <div className={styles.airingList}>
              {topAiringAnime.map((item) => (
                <Link
                  key={item.id}
                  href={`/title/${item.id}`}
                  className={styles.airingItem}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.poster}
                    alt={item.title}
                    className={styles.airingPoster}
                  />
                  <div className={styles.airingInfo}>
                    <span className={styles.airingName} title={item.title}>
                      {item.title}
                    </span>
                    <span className={styles.airingMeta}>
                      <span className={styles.airingType}>{item.typeLabel}</span>
                      <span>·</span>
                      <span>{item.year}</span>
                      <span>·</span>
                      <span className={styles.airingRating}>☆ {item.rating}</span>
                    </span>
                    <span className={styles.airingSchedule}>{item.schedule}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
