import { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import TileRow from "../components/TileRow";
import { SkeletonHero, SkeletonRow } from "../components/Skeleton";
import { SERVICES, STUDIOS, BRAND, formatDate } from "../lib/constants";
import { useHistory, entryCard } from "../lib/store";
import { getHomePageData } from "../lib/data.server";

const PERIODS = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "all", label: "All time" },
];

const rotate = (list, k) => {
  if (!Array.isArray(list) || list.length === 0) return [];
  const shift = k % list.length;
  return [...list.slice(shift), ...list.slice(0, shift)];
};

export async function getStaticProps() {
  const data = await getHomePageData();
  return {
    props: {
      initialData: data,
    },
    revalidate: 1800,
  };
}

export default function Home({ initialData }) {
  const [history] = useHistory();
  const [period, setPeriod] = useState("all");
  const [trendingType, setTrendingType] = useState("movie");
  const [trendingYear, setTrendingYear] = useState("all");
  const [discoverSort, setDiscoverSort] = useState("primary_release_date.desc");
  const [discoverItems, setDiscoverItems] = useState([]);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [discoverHasMore, setDiscoverHasMore] = useState(true);

  // Initial state hydrated from server data
  const [heroItems, setHeroItems] = useState(initialData?.heroItems || []);
  const [heroLoading, setHeroLoading] = useState(!initialData?.heroItems?.length);

  const [topToday, setTopToday] = useState(initialData?.topToday || []);
  const [topLoading, setTopLoading] = useState(!initialData?.topToday?.length);

  const [trendingMovies, setTrendingMovies] = useState(initialData?.trendingMovies || []);
  const [trendingMoviesLoading, setTrendingMoviesLoading] = useState(!initialData?.trendingMovies?.length);

  const [trendingSeries, setTrendingSeries] = useState(initialData?.trendingSeries || []);
  const [trendingSeriesLoading, setTrendingSeriesLoading] = useState(!initialData?.trendingSeries?.length);

  const [popular, setPopular] = useState(initialData?.popular || []);
  const [popularLoading, setPopularLoading] = useState(!initialData?.popular?.length);

  const [comingSoon, setComingSoon] = useState(initialData?.comingSoon || []);
  const [comingSoonLoading, setComingSoonLoading] = useState(!initialData?.comingSoon?.length);

  const [airing, setAiring] = useState(initialData?.airing || []);
  const [airingLoading, setAiringLoading] = useState(!initialData?.airing?.length);

  const [bollywood, setBollywood] = useState(initialData?.bollywood || []);
  const [bollywoodLoading, setBollywoodLoading] = useState(!initialData?.bollywood?.length);

  const [tollywood, setTollywood] = useState(initialData?.tollywood || []);
  const [tollywoodLoading, setTollywoodLoading] = useState(!initialData?.tollywood?.length);

  // Client-side dynamic refresh from live TMDB
  useEffect(() => {
    let active = true;

    // 1. Top 10 Today: overall platform top 10 (movies and series combined)
    fetch("/api/tmdb/discover?category=trending&type=all")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          const topSlice = data.slice(0, 10);
          setTopToday(topSlice);
          setTopLoading(false);
        }
      })
      .catch(() => {});

    // 2. Hero Spotlight & Trending Movies (weekly trending, deduplicated against Top 10)
    fetch("/api/tmdb/discover?category=trending&type=movie&time_window=week")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setHeroItems(data.slice(0, 6));
          setHeroLoading(false);

          setTopToday((currentTop) => {
            const topIds = new Set((currentTop || []).map((t) => String(t.id || t.tmdbId)));
            const distinct = data.filter((t) => !topIds.has(String(t.id || t.tmdbId)));
            setTrendingMovies(distinct.length >= 8 ? distinct.slice(0, 16) : data.slice(0, 16));
            setTrendingMoviesLoading(false);
            return currentTop;
          });
        }
      })
      .catch(() => {});

    // 3. Trending TV Series (strictly television series)
    fetch("/api/tmdb/discover?category=trending&type=tv")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setTrendingSeries(data.slice(0, 16));
          setTrendingSeriesLoading(false);
        }
      })
      .catch(() => {});

    // 4. Popular movies (for Popular on DIVINE)
    fetch("/api/tmdb/discover?category=popular&type=movie")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setPopular(data.slice(0, 16));
          setPopularLoading(false);
        }
      })
      .catch(() => {});

    // 5. Coming soon (upcoming theatrical/digital movies strictly in the future)
    fetch("/api/tmdb/discover?category=upcoming&type=movie")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          const todayStr = new Date().toISOString().split("T")[0];
          const futureOnly = data.filter((t) => t.releaseDate && t.releaseDate >= todayStr);
          const list = futureOnly.length > 0 ? futureOnly : data;
          setComingSoon(list.slice(0, 12));
          setComingSoonLoading(false);
        }
      })
      .catch(() => {});

    // 6. Airing (airing TV series)
    fetch("/api/tmdb/discover?category=airing_today&type=tv")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setAiring(data.slice(0, 12));
          setAiringLoading(false);
        }
      })
      .catch(() => {});

    // 7. Bollywood Blockbusters (Hindi cinema)
    fetch("/api/tmdb/discover?type=movie&language=hi&sort_by=popularity.desc")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setBollywood(data.slice(0, 16));
          setBollywoodLoading(false);
        }
      })
      .catch(() => {});

    // 8. Tollywood & South Cinema (Telugu/South cinema)
    fetch("/api/tmdb/discover?type=movie&language=te&sort_by=popularity.desc")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setTollywood(data.slice(0, 16));
          setTollywoodLoading(false);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setDiscoverLoading(true);
    fetch(`/api/tmdb/discover?type=movie&sort_by=${encodeURIComponent(discoverSort)}&page=${discoverPage}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) {
          const titles = Array.isArray(data) ? data : [];
          setDiscoverItems(titles.slice(0, 12));
          setDiscoverHasMore(titles.length > 12);
          setDiscoverLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setDiscoverItems([]);
          setDiscoverHasMore(false);
          setDiscoverLoading(false);
        }
      });
    return () => { active = false; };
  }, [discoverSort, discoverPage]);

  // Deduplicate continue watching by title
  const cont = useMemo(() => {
    const seen = new Set();
    const unique = [];
    for (const h of history || []) {
      const id = typeof h === "object" ? h?.id : h;
      if (!id || seen.has(id)) continue;
      const card = entryCard(h);
      if (!card) continue;
      seen.add(id);
      const titleStr =
        typeof card.title === "string"
          ? card.title
          : typeof card.name === "string"
          ? card.name
          : typeof h?.title === "string"
          ? h.title
          : String(id);
      unique.push({
        ...card,
        ...h,
        title: titleStr,
      });
    }
    return unique;
  }, [history]);

  const popularItems = useMemo(
    () => rotate(popular, period === "all" ? 0 : period === "week" ? 3 : 6),
    [popular, period]
  );

  const trendingPool = trendingType === "tv" ? trendingSeries : trendingMovies;
  const trendingItems = useMemo(() => {
    if (trendingYear === "all") return trendingPool;
    return trendingPool.filter((title) => String(title.year || "") === trendingYear);
  }, [trendingPool, trendingYear]);
  const trendingYears = useMemo(() => {
    const years = [...new Set([...trendingMovies, ...trendingSeries]
      .map((title) => String(title.year || ""))
      .filter((year) => /^\d{4}$/.test(year)))].sort((a, b) => Number(b) - Number(a));
    return [{ value: "all", label: "Year" }, ...years.map((year) => ({ value: year, label: year }))];
  }, [trendingMovies, trendingSeries]);

  return (
    <Layout flush description={`${BRAND.name}: movies, series and anime streaming directly from TMDB.`}>
      {heroLoading ? (
        <SkeletonHero />
      ) : heroItems.length > 0 ? (
        <HeroBanner items={heroItems} />
      ) : null}

      {cont.length > 0 && (
        <MediaRow title="Continue watching" href="/history">
          {cont.map((h) => (
            <MediaCard
              key={h.id}
              title={h}
              wide
              progress={h.progress}
              timeLeft={h.timeLeft}
            />
          ))}
        </MediaRow>
      )}

      {topLoading ? (
        <SkeletonRow title="Top 10 Today" count={6} />
      ) : topToday.length > 0 ? (
        <MediaRow title="Top 10 Today">
          {topToday.map((t, i) => (
            <MediaCard key={t.id || t.tmdbId} title={t} rank={i + 1} />
          ))}
        </MediaRow>
      ) : null}

      {popularLoading ? (
        <SkeletonRow title="Popular on DIVINE" count={6} />
      ) : popularItems.length > 0 ? (
        <MediaRow
          title="Popular on DIVINE"
          href="/browse/movie"
          menu={{ value: period, options: PERIODS, onChange: setPeriod }}
        >
          {popularItems.map((t) => (
            <MediaCard key={t.id || t.tmdbId} title={t} />
          ))}
        </MediaRow>
      ) : null}

      {(trendingType === "tv" ? trendingSeriesLoading : trendingMoviesLoading) ? (
        <SkeletonRow title="Trending" count={6} />
      ) : trendingItems.length > 0 ? (
        <MediaRow
          title="Trending"
          href={trendingType === "tv" ? "/browse/tv" : "/browse/movie"}
          menus={[
            {
              value: trendingType,
              options: [
                { value: "movie", label: "Movies" },
                { value: "tv", label: "Series" },
              ],
              onChange: (value) => {
                setTrendingType(value);
                setTrendingYear("all");
              },
            },
            {
              value: trendingYear,
              options: trendingYears,
              onChange: setTrendingYear,
            },
          ]}
        >
          {trendingItems.map((t) => (
            <MediaCard key={t.id || t.tmdbId} title={t} />
          ))}
        </MediaRow>
      ) : null}

      {/* Bollywood Blockbusters */}
      {bollywoodLoading ? (
        <SkeletonRow title="Bollywood Blockbusters" count={6} />
      ) : bollywood.length > 0 ? (
        <MediaRow
          title="Bollywood Blockbusters"
          href="/browse/movie?language=hi"
        >
          {bollywood.map((t) => (
            <MediaCard key={t.id || t.tmdbId} title={t} />
          ))}
        </MediaRow>
      ) : null}

      {/* Tollywood & South Cinema */}
      {tollywoodLoading ? (
        <SkeletonRow title="Tollywood & South Cinema" count={6} />
      ) : tollywood.length > 0 ? (
        <MediaRow
          title="Tollywood & South Cinema"
          href="/browse/movie?language=te"
        >
          {tollywood.map((t) => (
            <MediaCard key={t.id || t.tmdbId} title={t} />
          ))}
        </MediaRow>
      ) : null}

      <TileRow title="Browse by service" items={SERVICES} param="service" />
      <TileRow title="Browse by studio" items={STUDIOS} param="studio" />

      {comingSoonLoading ? (
        <SkeletonRow title="Coming soon" count={6} />
      ) : comingSoon.length > 0 ? (
        <MediaRow title="Coming soon" href="/schedule">
          {comingSoon.map((t) => (
            <MediaCard key={t.id || t.tmdbId} title={t} badge={formatDate(t.releaseDate)} />
          ))}
        </MediaRow>
      ) : null}

      {discoverLoading ? (
        <SkeletonRow title="Discover" count={6} />
      ) : discoverItems.length > 0 ? (
        <>
          <MediaRow
            title="Discover"
            href="/discover"
            tabs={[
              { value: "primary_release_date.desc", label: "Newest", selected: discoverSort === "primary_release_date.desc", onClick: () => { setDiscoverSort("primary_release_date.desc"); setDiscoverPage(1); } },
              { value: "popularity.desc", label: "Popular", selected: discoverSort === "popularity.desc", onClick: () => { setDiscoverSort("popularity.desc"); setDiscoverPage(1); } },
              { value: "vote_average.desc", label: "Top rated", selected: discoverSort === "vote_average.desc", onClick: () => { setDiscoverSort("vote_average.desc"); setDiscoverPage(1); } },
            ]}
            pager={{
              page: discoverPage,
              hasMore: discoverHasMore,
              loading: discoverLoading,
              previous: () => setDiscoverPage((page) => Math.max(1, page - 1)),
              next: () => setDiscoverPage((page) => page + 1),
            }}
          >
            {discoverItems.map((t) => <MediaCard key={t.id || t.tmdbId} title={t} />)}
          </MediaRow>
        </>
      ) : null}

      {airingLoading ? (
        <SkeletonRow title="Airing" count={6} />
      ) : airing.length > 0 ? (
        <MediaRow title="Airing" href="/schedule">
          {airing.map((t) => (
            <MediaCard key={t.id || t.tmdbId} title={t} badge={`New on ${t.airDay || "weekly"}`} />
          ))}
        </MediaRow>
      ) : null}
    </Layout>
  );
}
