import { useRouter } from "next/router";
import { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import { PageHead, Chips, TitleGrid, Empty } from "../components/Page";
import { TITLES, SERVICES, STUDIOS, getService, getStudio } from "../lib/data";

const TYPES = [
  { value: "all", label: "Everything" },
  { value: "movie", label: "Movies" },
  { value: "series", label: "Series" },
  { value: "anime", label: "Anime" },
];

export default function Discover() {
  const { query, replace } = useRouter();
  const [type, setType] = useState("all");
  const service = typeof query.service === "string" ? query.service : "all";
  const studio = typeof query.studio === "string" ? query.studio : "all";

  const [liveItems, setLiveItems] = useState(null);
  const [loading, setLoading] = useState(false);

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
          setLiveItems(Array.isArray(data) && data.length > 0 ? data : null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
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

  const shown = useMemo(
    () =>
      TITLES.filter(
        (t) =>
          (type === "all" || t.type === type) &&
          (service === "all" || t.service === service) &&
          (studio === "all" || t.studio === studio)
      ).sort((a, b) => b.rating - a.rating),
    [type, service, studio]
  );

  const displayItems = liveItems || shown;
  const crumbs = [service !== "all" && getService(service)?.name, studio !== "all" && getStudio(studio)?.name].filter(Boolean);

  return (
    <Layout title="Discover" description="Browse the catalogue by format, service and studio.">
      <div className="pageInner">
        <PageHead title="Discover" sub={crumbs.length ? crumbs.join(" · ") : "Filter the whole catalogue by format, service and studio."} />
        <div style={{ display: "grid", gap: 14, marginBottom: 30 }}>
          <Chips label="Format" options={TYPES} value={type} onChange={setType} />
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
        {loading && !displayItems.length ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-dim)" }}>
            Loading catalogue from TMDB...
          </div>
        ) : displayItems.length ? (
          <TitleGrid items={displayItems} />
        ) : (
          <Empty title="No matches" text="That combination has no titles. Clear a filter to widen the search." />
        )}
      </div>
    </Layout>
  );
}
