import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import TileRow from "../components/TileRow";
import { SERVICES, STUDIOS, BRAND, formatDate } from "../lib/constants";
import { useHistory } from "../lib/store";
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
      ...data,
    },
    revalidate: 1800,
  };
}

export default function Home({
  heroItems = [],
  topToday = [],
  popular = [],
  trending = [],
  serviceItemsMap = {},
  comingSoon = [],
  airing = [],
  titleCardMap = {},
}) {
  const [history] = useHistory();
  const [period, setPeriod] = useState("all");
  const [serviceId, setServiceId] = useState(SERVICES[0].id);

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

  const serviceItems = serviceItemsMap[serviceId] || [];

  return (
    <Layout flush description={`${BRAND.name}: movies, series and anime.`}>
      <HeroBanner items={heroItems} />

      {cont.length > 0 && (
        <MediaRow title="Continue watching" href="/history">
          {cont.map((h) => {
            const t = titleCardMap[h.id];
            return t ? (
              <MediaCard
                key={h.id}
                title={t}
                wide
                progress={h.progress}
                timeLeft={h.timeLeft}
              />
            ) : null;
          })}
        </MediaRow>
      )}

      <MediaRow title="Top 10 Today">
        {topToday.map((t, i) => (
          <MediaCard key={t.id} title={t} rank={i + 1} />
        ))}
      </MediaRow>

      <MediaRow title="Popular on Vivarium" menu={{ value: period, options: PERIODS, onChange: setPeriod }}>
        {popularItems.map((t) => (
          <MediaCard key={t.id} title={t} />
        ))}
      </MediaRow>

      <MediaRow title="Trending">
        {trending.map((t) => (
          <MediaCard key={t.id} title={t} />
        ))}
      </MediaRow>

      <TileRow title="Browse by service" items={SERVICES} param="service" />
      <TileRow title="Browse by studio" items={STUDIOS} param="studio" />

      <MediaRow
        title="Popular on"
        menu={{
          value: serviceId,
          options: SERVICES.map((s) => ({ value: s.id, label: s.name })),
          onChange: setServiceId,
        }}
      >
        {serviceItems.map((t) => (
          <MediaCard key={t.id} title={t} />
        ))}
      </MediaRow>

      <MediaRow title="Coming soon" href="/schedule">
        {comingSoon.map((t) => (
          <MediaCard key={t.id} title={t} badge={formatDate(t.releaseDate)} />
        ))}
      </MediaRow>

      <MediaRow title="Airing" href="/schedule">
        {airing.map((t) => (
          <MediaCard key={t.id} title={t} badge={`New on ${t.airDay || "weekly"}`} />
        ))}
      </MediaRow>
    </Layout>
  );
}
