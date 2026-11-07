import { useState, useMemo } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import { Empty } from "../components/Page";
import Art from "../components/Art";
import { getCardMap } from "../lib/data.server";
import { useHistory, removeFromHistory, entryCard, entryId } from "../lib/store";
import { Play, X, Trash2, Search, Film, Tv, Clock } from "lucide-react";
import styles from "../styles/History.module.css";

export async function getStaticProps() {
  const data = getCardMap();
  return {
    props: {
      ...data,
    },
    revalidate: 1800,
  };
}

export default function History({ cardMap = {} }) {
  const [history, setHistory] = useHistory();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // Map history records to titles
  const allEntries = useMemo(() => {
    return (history || [])
      .map((h) => {
        const title =
          entryCard(h) ||
          (h && h.id && cardMap[String(h.id).toLowerCase()]) ||
          null;
        if (!title) return null;
        return {
          ...h,
          title,
        };
      })
      .filter(Boolean);
  }, [history, cardMap]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const movies = allEntries.filter((e) => e.title.type === "movie").length;
    const series = allEntries.filter((e) => e.title.type === "series" || e.title.type === "anime").length;
    const inProgress = allEntries.filter((e) => (e.progress || 0) < 0.9).length;
    const completed = allEntries.filter((e) => (e.progress || 0) >= 0.9).length;
    return {
      all: allEntries.length,
      movies,
      series,
      inProgress,
      completed,
    };
  }, [allEntries]);

  // Filtered & searched entries
  const displayedEntries = useMemo(() => {
    let list = allEntries;

    if (activeFilter === "movies") {
      list = list.filter((e) => e.title.type === "movie");
    } else if (activeFilter === "series") {
      list = list.filter((e) => e.title.type === "series" || e.title.type === "anime");
    } else if (activeFilter === "in_progress") {
      list = list.filter((e) => (e.progress || 0) < 0.9);
    } else if (activeFilter === "completed") {
      list = list.filter((e) => (e.progress || 0) >= 0.9);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.title.toLowerCase().includes(q) ||
          (e.title.genres || []).some((g) => g.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allEntries, activeFilter, searchQuery]);

  const handleRemoveItem = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromHistory(setHistory, id);
  };

  const handleClearAll = () => {
    if (confirmClear) {
      setHistory([]);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  };

  return (
    <Layout
      title="Watch History"
      description="Pick up where you left off across all your movies and series."
    >
      <div className={`pageInner ${styles.pageWrap}`}>
        {/* Top Header Row */}
        <div className={styles.topRow}>
          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>History</h1>
            <p className={styles.pageSub}>
              {allEntries.length > 0
                ? `${allEntries.length} ${
                    allEntries.length === 1 ? "title" : "titles"
                  } in your watch history`
                : "Pick up where you left off."}
            </p>
          </div>

          {allEntries.length > 0 && (
            <div className={styles.topActions}>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClearAll}
                title="Clear all watch history"
              >
                <Trash2 size={15} />
                <span>{confirmClear ? "Confirm clear?" : "Clear history"}</span>
              </button>
              {confirmClear && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => setConfirmClear(false)}
                  style={{ opacity: 0.8 }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>

        {/* Controls Bar: Filter Pills + Search */}
        {allEntries.length > 0 && (
          <div className={styles.controlsBar}>
            <div className={styles.filterPills}>
              <button
                type="button"
                className={`${styles.pill} ${activeFilter === "all" ? styles.pillActive : ""}`}
                onClick={() => setActiveFilter("all")}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                className={`${styles.pill} ${activeFilter === "movies" ? styles.pillActive : ""}`}
                onClick={() => setActiveFilter("movies")}
              >
                <Film size={13} />
                Movies ({counts.movies})
              </button>
              <button
                type="button"
                className={`${styles.pill} ${activeFilter === "series" ? styles.pillActive : ""}`}
                onClick={() => setActiveFilter("series")}
              >
                <Tv size={13} />
                Series ({counts.series})
              </button>
              <button
                type="button"
                className={`${styles.pill} ${activeFilter === "in_progress" ? styles.pillActive : ""}`}
                onClick={() => setActiveFilter("in_progress")}
              >
                In progress ({counts.inProgress})
              </button>
              <button
                type="button"
                className={`${styles.pill} ${activeFilter === "completed" ? styles.pillActive : ""}`}
                onClick={() => setActiveFilter("completed")}
              >
                Completed ({counts.completed})
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search history..."
                aria-label="Search watch history"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
        )}

        {/* History Items Grid */}
        {displayedEntries.length > 0 ? (
          <div className={styles.historyGrid}>
            {displayedEntries.map((item) => {
              const progressVal = item.progress || 0.1;
              const isCompleted = progressVal >= 0.9;
              const progressPct = Math.min(100, Math.round(progressVal * 100));

              // Compute remaining time
              const remMinutes = Math.round(
                (item.title.runtime || 115) * (1 - progressVal)
              );
              const remHours = Math.floor(remMinutes / 60);
              const remMins = remMinutes % 60;
              const timeRemaining = isCompleted
                ? "Completed"
                : item.timeLeft ||
                  (remHours > 0
                    ? `${remHours}h ${remMins}m left`
                    : `${remMins}m left`);

              return (
                <Link
                  key={item.id}
                  href={`/watch/${item.id}`}
                  className={styles.historyCard}
                >
                  <div className={styles.artWrap}>
                    <Art
                      title={item.title}
                      variant="backdrop"
                      showTitle={false}
                      className={styles.cardImg}
                    />

                    {/* Hover Play Button */}
                    <div className={styles.playOverlay}>
                      <div className={styles.playIconCircle}>
                        <Play size={18} fill="currentColor" />
                      </div>
                    </div>

                    {/* Individual Remove (X) Button */}
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={(e) => handleRemoveItem(e, item.id)}
                      title="Remove from history"
                      aria-label="Remove from history"
                    >
                      <X size={15} />
                    </button>

                    {/* Progress Bar */}
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className={styles.meta}>
                    <h3 className={styles.cardTitle}>{item.title.title}</h3>
                    <p className={styles.cardSub}>
                      <span>{item.title.year}</span>
                      <span className={styles.dot}>•</span>
                      <span className={styles.timeLeft}>
                        <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
                        {timeRemaining}
                      </span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty
            title={
              allEntries.length === 0
                ? "Nothing watched yet"
                : "No matching titles found"
            }
            text={
              allEntries.length === 0
                ? "Press play on any movie or series and your progress will be saved here automatically."
                : "Try selecting another filter or clearing your search term."
            }
            href="/"
            cta="Explore movies & series"
          />
        )}
      </div>
    </Layout>
  );
}
