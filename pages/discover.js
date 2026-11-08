import { useRouter } from "next/router";
import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";
import { PageHead, Chips, TitleGrid, Empty } from "../components/Page";
import { SkeletonGrid } from "../components/Skeleton";
import TileRow from "../components/TileRow";
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

const SORTS = [
  { value: "popularity.desc", label: "Most Popular" },
  { value: "vote_average.desc", label: "Highest Rated" },
  { value: "primary_release_date.desc", label: "Release Date" },
  { value: "title.asc", label: "Title (A-Z)" },
];

export default function Discover() {
  const router = useRouter();
  const { query, replace } = router;
  const type = typeof query.type === "string" ? query.type : "all";
  const service = typeof query.service === "string" ? query.service : "all";
  const studio = typeof query.studio === "string" ? query.studio : "all";
  const sortBy = typeof query.sort_by === "string" ? query.sort_by : "popularity.desc";

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef(null);

  // Fetch initial page 1 on filter/sort change
  useEffect(() => {
    let active = true;
    setLoading(true);
    setPage(1);
    setHasMore(true);

    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (service !== "all") params.set("service", service);
    if (studio !== "all") params.set("studio", studio);
    if (sortBy) params.set("sort_by", sortBy);
    params.set("page", "1");

    const endpoint = type === "anime"
      ? `/api/anilist/discover?${params.toString()}`
      : `/api/tmdb/discover?${params.toString()}`;

    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) {
          const arr = Array.isArray(data) ? data : [];
          setItems(arr);
          setLoading(false);
          if (arr.length === 0 || arr.length < 20) setHasMore(false);
        }
      })
      .catch(() => {
        if (active) {
          setItems([]);
          setLoading(false);
          setHasMore(false);
        }
      });

    return () => {
      active = false;
    };
  }, [type, service, studio, sortBy]);

  // Load next page function
  const loadNextPage = useCallback(() => {
    if (loading || loadingMore || !hasMore || page >= 500) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (service !== "all") params.set("service", service);
    if (studio !== "all") params.set("studio", studio);
    if (sortBy) params.set("sort_by", sortBy);
    params.set("page", String(nextPage));

    const endpoint = type === "anime"
      ? `/api/anilist/discover?${params.toString()}`
      : `/api/tmdb/discover?${params.toString()}`;

    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        if (arr.length === 0) {
          setHasMore(false);
        } else {
          setItems((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const newItems = arr.filter((x) => !seen.has(x.id));
            return [...prev, ...newItems];
          });
          setPage(nextPage);
          if (nextPage >= 500 || arr.length < 20) setHasMore(false);
        }
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
        setHasMore(false);
      });
  }, [loading, loadingMore, hasMore, page, type, service, studio, sortBy]);

  // Infinite scroll intersection observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage]);

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

        {/* Visual studio logo row when all studios selected */}
        {studio === "all" && (
          <div style={{ marginBottom: 28 }}>
            <TileRow title="Browse by studio" items={STUDIOS} param="studio" />
          </div>
        )}

        {/* Filter Chips & Sort Controls */}
        <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
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

        {/* Sort & Count Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 24,
            paddingBottom: 12,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
            {items.length > 0 ? `${items.length} titles loaded` : ""}
          </span>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setParam("sort_by", e.target.value)}
              aria-label="Sort catalog"
              style={{
                background: "var(--surface-2, #14171d)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value} style={{ background: "#111" }}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <SkeletonGrid count={12} wide={false} />
        ) : items.length > 0 ? (
          <>
            <TitleGrid items={items} />

            {/* Scroll Sentinel for infinite loading */}
            <div ref={sentinelRef} style={{ height: 40, margin: "24px 0" }}>
              {loadingMore && <SkeletonGrid count={6} wide={false} />}
            </div>
          </>
        ) : (
          <Empty title="No matches" text="That combination has no titles on TMDB. Clear a filter to widen the search." />
        )}
      </div>
    </Layout>
  );
}
