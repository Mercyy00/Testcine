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

const rotate = (list, k) => [...list.slice(k), ...list.slice(0, k)];

export async function getStaticProps() {
  const data = getHomePageData();
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
  const [serviceId, setServiceId] = useState(SERVICES[0].id);

  // Use pre-fetched server data as initial state, then optionally enhance client-side
  const [heroItems, setHeroItems] = useState(initialData?.heroItems || []);
  const [heroLoading, setHeroLoading] = useState(!initialData?.heroItems?.length);

  const [topToday, setTopToday] = useState(initialData?.topToday || []);
  const [topLoading, setTopLoading] = useState(!initialData?.topToday?.length);

  const [popular, setPopular] = useState(initialData?.popular || []);
  const [popularLoading, setPopularLoading] = useState(!initialData?.popular?.length);

  const [trending, setTrending] = useState(initialData?.trending || []);
  const [trendingLoading, setTrendingLoading] = useState(!initialData?.trending?.length);

  const [serviceItems, setServiceItems] = useState(initialData?.serviceItemsMap?.[serviceId] || []);
  const [serviceLoading, setServiceLoading] = useState(!initialData?.serviceItemsMap?.[serviceId]?.length);

  const [comingSoon, setComingSoon] = useState(initialData?.comingSoon || []);
  const [comingSoonLoading, setComingSoonLoading] = useState(!initialData?.comingSoon?.length);

  const [airing, setAiring] = useState(initialData?.airing || []);
  const [airingLoading, setAiringLoading] = useState(!initialData?.airing?.length);

  // Deduplicate continue watching by title
  const cont = useMemo(() => {
    const seen = new Set();
    const unique = [];
    for (const h of history || []) {
      const id = typeof h === "object" ? h?.id : h;
      if (!id || seen.has(id)) continue;
      const card = entryCard(h);
      // Skip entries that cannot render (no snapshot and not in cardMap)
      if (!card) continue;
      seen.add(id);
      unique.push({ ...h, title: card });
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
