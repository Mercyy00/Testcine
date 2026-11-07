import { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import TileRow from "../components/TileRow";
import { SkeletonHero, SkeletonRow } from "../components/Skeleton";
import { SERVICES, STUDIOS, BRAND, formatDate } from "../lib/constants";
import { useHistory } from "../lib/store";

const PERIODS = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "all", label: "All time" },
];

const rotate = (list, k) => [...list.slice(k), ...list.slice(0, k)];

export async function getStaticProps() {
  return {
    props: {},
    revalidate: 1800,
  };
}

export default function Home() {
  const [history] = useHistory();
  const [period, setPeriod] = useState("all");
  const [serviceId, setServiceId] = useState(SERVICES[0].id);

  // Dynamic TMDB API state
  const [heroItems, setHeroItems] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);

  const [topToday, setTopToday] = useState([]);
  const [topLoading, setTopLoading] = useState(true);

  const [popular, setPopular] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);

  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [serviceItems, setServiceItems] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(true);

  const [comingSoon, setComingSoon] = useState([]);
  const [comingSoonLoading, setComingSoonLoading] = useState(true);

  const [airing, setAiring] = useState([]);
  const [airingLoading, setAiringLoading] = useState(true);

  // 1. Hero & Trending from TMDB
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=trending&type=movie")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setHeroItems(data.slice(0, 5));
          setTrending(data.slice(0, 14));
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

  // 2. Top Today from TMDB
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=top&type=movie")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setTopToday(data.slice(0, 10));
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

  // 3. Popular on Vivarium from TMDB
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=popular&type=movie")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setPopular(data.slice(0, 14));
          setPopularLoading(false);
        }
      })
      .catch(() => {
        if (active) setPopularLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // 4. Popular by selected streaming service from TMDB
  useEffect(() => {
    let active = true;
    setServiceLoading(true);
    fetch(`/api/tmdb/discover?service=${serviceId}&type=movie`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) {
          setServiceItems(Array.isArray(data) ? data.slice(0, 12) : []);
          setServiceLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setServiceItems([]);
          setServiceLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [serviceId]);

  // 5. Coming Soon from TMDB
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=upcoming&type=movie")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setComingSoon(data.slice(0, 12));
          setComingSoonLoading(false);
        }
      })
      .catch(() => {
        if (active) setComingSoonLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // 6. Airing TV Series from TMDB
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=on_the_air&type=tv")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setAiring(data.slice(0, 12));
          setAiringLoading(false);
        }
      })
      .catch(() => {
        if (active) setAiringLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Deduplicate continue watching by title
  const cont = useMemo(() => {
    const seen = new Set();
    const unique = [];
    for (const h of history || []) {
      if (!seen.has(h.id)) {
        seen.add(h.id);
        unique.push(h);
      }
    }
    return unique;
  }, [history]);

  const popularItems = useMemo(
    () => rotate(popular, period === "all" ? 0 : period === "week" ? 3 : 6),
    [popular, period]
  );

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
        <SkeletonRow title="Popular on Vivarium" count={6} />
      ) : popularItems.length > 0 ? (
        <MediaRow
          title="Popular on Vivarium"
          menu={{ value: period, options: PERIODS, onChange: setPeriod }}
        >
          {popularItems.map((t) => (
            <MediaCard key={t.id || t.tmdbId} title={t} />
          ))}
        </MediaRow>
      ) : null}

      {trendingLoading ? (
        <SkeletonRow title="Trending" count={6} />
      ) : trending.length > 0 ? (
        <MediaRow title="Trending">
          {trending.map((t) => (
            <MediaCard key={t.id || t.tmdbId} title={t} />
          ))}
        </MediaRow>
      ) : null}

      <TileRow title="Browse by service" items={SERVICES} param="service" />
      <TileRow title="Browse by studio" items={STUDIOS} param="studio" />

      {serviceLoading ? (
        <SkeletonRow title="Popular on" count={6} />
      ) : serviceItems.length > 0 ? (
        <MediaRow
          title="Popular on"
          menu={{
            value: serviceId,
            options: SERVICES.map((s) => ({ value: s.id, label: s.name })),
            onChange: setServiceId,
          }}
        >
          {serviceItems.map((t) => (
            <MediaCard key={t.id || t.tmdbId} title={t} />
          ))}
        </MediaRow>
      ) : null}

      {comingSoonLoading ? (
        <SkeletonRow title="Coming soon" count={6} />
      ) : comingSoon.length > 0 ? (
        <MediaRow title="Coming soon" href="/schedule">
          {comingSoon.map((t) => (
            <MediaCard key={t.id || t.tmdbId} title={t} badge={formatDate(t.releaseDate)} />
          ))}
        </MediaRow>
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
