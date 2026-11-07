import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import SearchPalette from "../components/SearchPalette";
import { PageHead, TitleGrid, Empty } from "../components/Page";
import { SkeletonGrid } from "../components/Skeleton";

export async function getStaticProps() {
  return {
    props: {},
    revalidate: 1800,
  };
}

export default function SearchPage() {
  const { query } = useRouter();
  const q = typeof query.q === "string" ? query.q : "";
  const [liveResults, setLiveResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState([]);
  const [fallbackLoading, setFallbackLoading] = useState(true);

  // Fetch popular movies as fallback exploration from TMDB API
  useEffect(() => {
    let active = true;
    fetch("/api/tmdb/discover?category=popular&type=movie")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) {
          setFallback(Array.isArray(data) ? data.slice(0, 12) : []);
          setFallbackLoading(false);
        }
      })
      .catch(() => {
        if (active) setFallbackLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setLiveResults(null);
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return;
        setLiveResults(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        if (err.name !== "AbortError") {
          console.error("Search error:", err);
          setLiveResults([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [q]);

  const results = liveResults !== null ? liveResults : [];

  return (
    <Layout title={q ? `Search: ${q}` : "Search"} description="Search movies, series and anime directly from TMDB.">
      <div className="pageInner">
        <PageHead
          title={q ? `Results for “${q}”` : "Search"}
          sub={
            loading
              ? "Searching TMDB..."
              : q
              ? `${results.length} title${results.length === 1 ? "" : "s"} found`
              : "Type a title, actor, genre or keyword to search TMDB."
          }
        />
        <div style={{ marginBottom: 28 }} className="mobileOnlySearch">
          <SearchPalette wide autoFocus={!q} />
        </div>

        {loading ? (
          <SkeletonGrid count={8} wide={false} />
        ) : q && results.length === 0 ? (
          <>
            <Empty
              title="No titles match"
              text="Check the spelling or try a broader keyword. Here are some popular TMDB picks instead."
            />
            {fallbackLoading ? <SkeletonGrid count={8} wide={false} /> : <TitleGrid items={fallback} />}
          </>
        ) : results.length > 0 ? (
          <TitleGrid items={results} />
        ) : fallbackLoading ? (
          <SkeletonGrid count={8} wide={false} />
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
