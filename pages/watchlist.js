import { useState, useMemo } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import MediaCard from "../components/MediaCard";
import { getCardMap } from "../lib/data.server";
import { useList, entryCard, entryId } from "../lib/store";
import styles from "../styles/Lists.module.css";

export async function getStaticProps() {
  const data = getCardMap();
  return {
    props: {
      ...data,
    },
    revalidate: 1800,
  };
}

export default function WatchlistPage({ cardMap = {} }) {
  const [watchlist] = useList();
  const [filter, setFilter] = useState("all");

  const titles = useMemo(() => {
    return (watchlist || [])
      .map((entry) => entryCard(entry) || cardMap[String(entryId(entry)).toLowerCase()] || null)
      .filter(Boolean);
  }, [watchlist, cardMap]);

  const filteredTitles = useMemo(() => {
    if (filter === "all") return titles;
    return titles.filter((t) => t.type === filter);
  }, [titles, filter]);

  return (
    <Layout title="My list">
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.pageTitle}>My list</h1>
            <p className={styles.pageSub}>Save anything with the plus button.</p>
          </div>
        </div>

        {titles.length === 0 ? (
          /* Empty state matching user reference screenshot */
          <div className={styles.emptyWrap}>
            <h2 className={styles.emptyTitle}>Your list is empty</h2>
            <p className={styles.emptyDesc}>
              Tap the plus on any poster and it will show up here, on this device.
            </p>
            <Link href="/movies" className={styles.findBtn}>
              Find something
            </Link>
          </div>
        ) : (
          <div>
            {/* Filter Pills */}
            <div className={styles.watchlistFilters}>
              {["all", "movie", "series", "anime"].map((type) => {
                const count =
                  type === "all"
                    ? titles.length
                    : titles.filter((t) => t.type === type).length;
                if (type !== "all" && count === 0) return null;
                const label =
                  type === "all"
                    ? "All"
                    : type === "movie"
                    ? "Movies"
                    : type === "series"
                    ? "Series"
                    : "Anime";
                return (
                  <button
                    key={type}
                    type="button"
                    className={`${styles.filterPill} ${
                      filter === type ? styles.filterPillActive : ""
                    }`}
                    onClick={() => setFilter(type)}
                  >
                    <span>{label}</span>
                    <span className={styles.pillCount}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Grid of titles */}
            <div className={styles.watchlistGrid}>
              {filteredTitles.map((t) => (
                <MediaCard key={t.id} title={t} wide={true} fluid={true} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
