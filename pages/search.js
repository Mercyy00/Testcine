import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import SearchPalette from "../components/SearchPalette";
import { PageHead, TitleGrid, Empty } from "../components/Page";
import { searchTitles, getTitle, TITLES } from "../lib/data";

export default function SearchPage() {
  const { query } = useRouter();
  const q = typeof query.q === "string" ? query.q : "";
  const [liveResults, setLiveResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const localResults = useMemo(() => searchTitles(q, 60), [q]);
  const fallback = useMemo(
    () =>
      TITLES.filter((t) => t.status !== "upcoming")
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 12),
    []
  );

  useEffect(() => {
    if (!q.trim()) {
      setLiveResults(null);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return;
        // Merge without duplicates and hydrate with local high-res metadata
        const seen = new Set();
        const merged = [];
        [...data, ...localResults].forEach((item) => {
          if (!item) return;
          const key = `${item.type || ""}-${item.tmdbId || item.id}`;
          if (seen.has(key) || seen.has(item.id)) return;
          seen.add(key);
          seen.add(item.id);

          const localMatch = item.tmdbId ? getTitle(String(item.tmdbId)) : getTitle(item.id);
          const fullItem = localMatch ? { ...item, ...localMatch } : item;
          merged.push(fullItem);
        });
        setLiveResults(merged);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Search error:", err);
        setLiveResults(localResults);
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [q, localResults]);

  const results = liveResults !== null ? liveResults : localResults;

  return (
    <Layout title={q ? `Search: ${q}` : "Search"} description="Search movies, series and anime.">
      <div className="pageInner">
        <PageHead
          title={q ? `Results for “${q}”` : "Search"}
          sub={
            loading
              ? "Searching TMDB..."
              : q
              ? `${results.length} title${results.length === 1 ? "" : "s"} found`
              : "Type a title, a genre or a year."
          }
        />
        <div style={{ marginBottom: 28 }} className="mobileOnlySearch">
          <SearchPalette wide autoFocus={!q} />
        </div>
        {q && results.length === 0 && !loading ? (
          <>
            <Empty
              title="No titles match"
              text="Check the spelling or try a broader word such as a genre. Here are some popular picks instead."
            />
            <TitleGrid items={fallback} />
          </>
        ) : results.length ? (
          <TitleGrid items={results} />
        ) : (
          <TitleGrid items={fallback} />
        )}
      </div>
      <style jsx global>{`
        @media (min-width: 901px) {
          .mobileOnlySearch {
            display: none;
          }
        }
      `}</style>
    </Layout>
  );
}
