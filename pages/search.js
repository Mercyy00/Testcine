import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import SearchPalette from "../components/SearchPalette";
import { PageHead, TitleGrid, Empty } from "../components/Page";
import { getSearchPageData } from "../lib/data.server";

export async function getStaticProps() {
  const data = getSearchPageData();
  return {
    props: {
      ...data,
    },
    revalidate: 1800,
  };
}

export default function SearchPage({ fallback = [] }) {
  const { query } = useRouter();
  const q = typeof query.q === "string" ? query.q : "";
  const [liveResults, setLiveResults] = useState(null);
  const [loading, setLoading] = useState(false);

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
