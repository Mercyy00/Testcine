import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import TileRow from "../components/TileRow";
import {
  HERO_IDS,
  getTitle,
  topToday,
  popular,
  trending,
  comingSoon,
  airing,
  SERVICES,
  STUDIOS,
  TITLES,
  formatDate,
  BRAND,
} from "../lib/data";
import { useHistory } from "../lib/store";

// Top curated hero items for the homepage
const heroItems = HERO_IDS.map(getTitle).filter(Boolean);

const PERIODS = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "all", label: "All time" },
];

const rotate = (list, k) => [...list.slice(k), ...list.slice(0, k)];

export default function Home() {
  const [history] = useHistory();
  const [period, setPeriod] = useState("all");
  const [serviceId, setServiceId] = useState(SERVICES[0].id);

  const cont = history || [];

  const popularItems = useMemo(
    () => rotate(popular, period === "all" ? 0 : period === "week" ? 3 : 6),
    [period]
  );

  const serviceItems = useMemo(() => {
    const list = TITLES.filter((t) => t.service === serviceId && t.status !== "upcoming");
    return list.sort((a, b) => b.rating - a.rating);
  }, [serviceId]);

  return (
    <Layout flush description={`${BRAND.name}: movies, series and anime.`}>
      <HeroBanner items={heroItems} />

      {cont.length > 0 && (
        <MediaRow title="Continue watching" href="/history">
          {cont.map((h) => {
            const t = getTitle(h.id);
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
          <MediaCard key={t.id} title={t} badge={`New on ${t.airDay}`} />
        ))}
      </MediaRow>
    </Layout>
  );
}
