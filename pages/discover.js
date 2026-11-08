import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { PageHead, Chips, TitleGrid, Empty } from "../components/Page";
import { SkeletonGrid } from "../components/Skeleton";
import { SERVICES, STUDIOS, getService, getStudio } from "../lib/constants";

export async function getStaticProps() {
  return {
    props: {},
    revalidate: 1800,
  };
}

const TYPES = [
  { value: "all", label: "Everything" },
  { value: "movie", label: "Movies" },
  { value: "series", label: "Series" },
  { value: "anime", label: "Anime" },
];

export default function Discover() {
  const { query, replace } = useRouter();
  const type = typeof query.type === "string" ? query.type : "all";
  const service = typeof query.service === "string" ? query.service : "all";
  const studio = typeof query.studio === "string" ? query.studio : "all";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (service !== "all") params.set("service", service);
    if (studio !== "all") params.set("studio", studio);

    fetch(`/api/tmdb/discover?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) {
          setItems(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setItems([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [type, service, studio]);

  const setParam = (key, value) => {
    const next = { ...query };
    if (value === "all") delete next[key];
    else next[key] = value;
    replace({ pathname: "/discover", query: next }, undefined, { shallow: true });
  };

  const crumbs = [
    service !== "all" && getService(service)?.name,
    studio !== "all" && getStudio(studio)?.name,
  ].filter(Boolean);

  return (
    <Layout title="Discover" description="Browse the catalogue by format, service and studio dynamically via TMDB.">
      <div className="pageInner">
        <PageHead
          title="Discover"
          sub={crumbs.length ? crumbs.join(" · ") : "Filter the whole catalogue by format, service and studio directly from TMDB."}
        />
        <div style={{ display: "grid", gap: 14, marginBottom: 30 }}>
          <Chips label="Format" options={TYPES} value={type} onChange={(v) => setParam("type", v)} />
          <Chips
            label="Service"
            options={[{ value: "all", label: "All services" }, ...SERVICES.map((s) => ({ value: s.id, label: s.name }))]}
            value={service}
            onChange={(v) => setParam("service", v)}
          />
          <Chips
            label="Studio"
            options={[{ value: "all", label: "All studios" }, ...STUDIOS.map((s) => ({ value: s.id, label: s.name }))]}
            value={studio}
            onChange={(v) => setParam("studio", v)}
          />
        </div>

        {loading ? (
          <SkeletonGrid count={12} wide={false} />
        ) : items.length > 0 ? (
          <TitleGrid items={items} />
        ) : (
          <Empty title="No matches" text="That combination has no titles on TMDB. Clear a filter to widen the search." />
        )}
      </div>
    </Layout>
  );
}
