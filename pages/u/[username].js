import { useState, useMemo, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import MediaCard from "../../components/MediaCard";
import { getCardMap } from "../../lib/data.server";
import { useToast } from "../../lib/useToast";
import { DEFAULT_AVATAR } from "../../lib/avatars";

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

export async function getStaticProps() {
  const data = getCardMap();
  return {
    props: {
      ...data,
    },
    revalidate: 1800,
  };
}
import {
  useProfiles,
  useActiveProfileId,
  useSettings,
  useHistory,
  useList,
  useReactions,
  updateProfile,
  PROFILE_AVATARS,
} from "../../lib/store";
import {
  Lock,
  Pencil,
  Share2,
  X,
  Check,
} from "lucide-react";
import styles from "../../styles/Profile.module.css";

const MONTHS = (() => {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(d.toLocaleString("en-US", { month: "short" }));
  }
  return result;
})();
const DAYS = ["Mon", "Wed", "Fri"];

// Generate 26 weeks (182 days) heatmap cells from real watch history
function generateHeatmap(history = []) {
  const totalWeeks = 26;
  const daysPerWeek = 7;
  const grid = [];

  // Map dates of watch history to counts
  const dayCounts = {};
  const dayMs = 24 * 60 * 60 * 1000;
  (history || []).forEach((h) => {
    if (h.at) {
      const dKey = new Date(h.at).toISOString().slice(0, 10);
      dayCounts[dKey] = (dayCounts[dKey] || 0) + 1;
    }
  });

  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 6) % 7; // Monday = 0

  for (let w = 0; w < totalWeeks; w++) {
    for (let d = 0; d < daysPerWeek; d++) {
      const daysAgo = (totalWeeks - 1 - w) * 7 + (currentDayOfWeek - d);
      let level = 0;
      if (daysAgo >= 0) {
        const targetDate = new Date(now.getTime() - daysAgo * dayMs);
        const dKey = targetDate.toISOString().slice(0, 10);
        const count = dayCounts[dKey] || 0;
        if (count >= 4) level = 4;
        else if (count === 3) level = 3;
        else if (count === 2) level = 2;
        else if (count === 1) level = 1;
      }
      grid.push({ week: w, day: d, level });
    }
  }
  return grid;
}

export default function UserProfile({ cardMap = {} }) {
  const router = useRouter();
  const { username } = router.query;

  const resolveTitle = (id) => {
    if (!id) return null;
    if (typeof id === "object" && id.id) return id;
    return cardMap[String(id).toLowerCase()] || null;
  };

  const [profiles, setProfiles] = useProfiles();
  const [activeProfileId] = useActiveProfileId();
  const [settings, setSettings] = useSettings();
  const [history] = useHistory();
  const [watchlist] = useList();
  const [reactions] = useReactions();

  // Active Tab: "history" | "liked" | "watchlist"
  const [activeTab, setActiveTab] = useState("history");

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editHidden, setEditHidden] = useState(true);

  // Toast with auto-cleanup
  const [toast, showToast] = useToast(2500);

  // Find profile by username slug, or fallback to active/first profile
  const profile = useMemo(() => {
    const rawUser = String(username || "guest").toLowerCase();
    const found = (profiles || []).find(
      (p) => p.name.toLowerCase().replace(/\s+/g, "") === rawUser || p.id === rawUser
    );
    if (found) return found;

    return {
      id: "guest",
      name: "Guest",
      avatar: DEFAULT_AVATAR,
    };
  }, [profiles, username]);

  // Sync edit form when modal opens
  const openEditModal = () => {
    setEditName(profile.name || "Guest");
    setEditAvatar(profile.avatar || PROFILE_AVATARS[0].url);
    setEditHidden(settings.historyHidden !== false);
    setIsEditing(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const trimmed = (editName || "").trim();
    if (!trimmed) return;

    updateProfile(setProfiles, profile.id, {
      name: trimmed,
      avatar: editAvatar,
    });

    setSettings((s) => ({
      ...s,
      name: trimmed,
      avatar: editAvatar,
      historyHidden: editHidden,
    }));

    setIsEditing(false);
    showToast("Profile updated");

    // If name changed, update route cleanly
    const newSlug = trimmed.toLowerCase().replace(/\s+/g, "");
    if (newSlug !== String(username || "").toLowerCase()) {
      router.replace(`/u/${newSlug}`);
    }
  };

  const handleShare = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const url = typeof window !== "undefined" ? window.location.href : `${siteUrl}/u/${profile.name.toLowerCase()}`;
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(url);
    }
    showToast("Profile link copied to clipboard");
  };

  // 1. Watched History Titles
  const watchedEntries = useMemo(() => {
    const raw = history || [];
    return raw
      .map((h) => {
        const t = resolveTitle(h.id);
        if (!t) return null;
        return { ...h, title: t };
      })
      .filter(Boolean);
  }, [history, cardMap]);

  // 2. Liked Titles
  const likedEntries = useMemo(() => {
    const sourceReactions = reactions || {};
    const likedIds = Object.entries(sourceReactions)
      .filter(([_, r]) => r === "like" || r === "love")
      .map(([id]) => id);

    return likedIds.map(resolveTitle).filter(Boolean);
  }, [reactions, cardMap]);

  // 3. Watchlist Titles
  const watchlistEntries = useMemo(() => {
    const sourceWatchlist = watchlist || [];
    return sourceWatchlist.map(resolveTitle).filter(Boolean);
  }, [watchlist, cardMap]);

  // Dynamic Genre Analytics Calculation
  const genreStats = useMemo(() => {
    const counts = {};
    const minutes = {};
    let totalMinutes = 0;

    for (const item of watchedEntries) {
      const t = item.title;
      if (!t) continue;
      const itemMinutes = (t.runtime || 90) * (item.progress || 0.5);
      totalMinutes += itemMinutes;
      for (const g of t.genres || []) {
        counts[g] = (counts[g] || 0) + 1;
        minutes[g] = (minutes[g] || 0) + itemMinutes;
      }
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return [];

    return sorted.slice(0, 5).map(([name, count]) => {
      const mins = minutes[name] || 0;
      const hours = mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${Math.round(mins)}m`;
      const percent = totalMinutes > 0 ? Math.min(100, Math.round((mins / totalMinutes) * 100)) : 0;
      return { name, count, hours, percent };
    });
  }, [watchedEntries]);

  // Movie vs Series ratio
  const ratio = useMemo(() => {
    let movies = 0;
    let series = 0;
    for (const item of watchedEntries) {
      if (item.title?.type === "movie") movies++;
      else series++;
    }
    const total = movies + series;
    const moviePct = total > 0 ? Math.round((movies / total) * 100) : 0;
    return { movies, series, moviePct };
  }, [watchedEntries]);

  const genreSummary = useMemo(() => {
    if (!watchedEntries.length) return "Watch something to see your genres";
    const mins = watchedEntries.reduce((a, i) => a + (i.title?.runtime || 90) * (i.progress || 0.5), 0);
    return `${Math.round(mins / 60)}h across ${watchedEntries.length} ${watchedEntries.length === 1 ? "title" : "titles"}`;
  }, [watchedEntries]);

  // Heatmap Grid
  const heatmapData = useMemo(() => generateHeatmap(history), [history]);

  const displayName = profile.name || "Guest";
  const displayAvatar = profile.avatar || DEFAULT_AVATAR;
  const watchedCount = watchedEntries.length;
  const likedCount = likedEntries.length;
  const watchlistCount = watchlistEntries.length;

  const activitySummary = useMemo(() => {
    const totalWatched = watchedEntries.length;
    const dateMap = new Set();
    const dayMs = 24 * 60 * 60 * 1000;
    (history || []).forEach((h) => {
      if (h.at) {
        dateMap.add(new Date(h.at).toDateString());
      }
    });
    const activeDays = dateMap.size;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let check = new Date(today);
    if (!dateMap.has(check.toDateString())) {
      check = new Date(today.getTime() - dayMs);
    }
    while (dateMap.has(check.toDateString())) {
      streak++;
      check = new Date(check.getTime() - dayMs);
    }

    return `${totalWatched} ${totalWatched === 1 ? "title" : "titles"} · ${activeDays} ${
      activeDays === 1 ? "active day" : "active days"
    } · ${streak} day streak`;
  }, [watchedEntries, history]);

  return (
    <Layout
      title={`${displayName} (@${displayName.toLowerCase().replace(/\s+/g, "")})`}
      description={`View ${displayName}'s watch history, liked titles, and custom collections on Vivarium.`}
    >
      <div className={styles.pageWrap}>
        {/* 1. Hero Banner (last watched backdrop) */}
        <section className={styles.heroBanner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {(watchedEntries[0]?.title?.backdrop || likedEntries[0]?.backdrop) && (
            <img
              src={watchedEntries[0]?.title?.backdrop || likedEntries[0]?.backdrop}
              alt="Hero Backdrop"
              loading="lazy"
              decoding="async"
              className={styles.heroBackdrop}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <div className={styles.heroGradient} />

          <div className={styles.heroContent}>
            <div className={styles.profileIdentity}>
              <div className={styles.avatarWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className={styles.avatarImg}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = "grid";
                    }
                  }}
                />
                <div className={styles.avatarFallback} style={{ display: "none" }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className={styles.metaInfo}>
                <h1 className={styles.profileName}>{displayName}</h1>
                <div className={styles.statsRow}>
                  <span>{watchedCount} watched</span>
                  <span>·</span>
                  <span>{likedCount} liked</span>
                  <span>·</span>
                  <span>{watchlistCount} in watchlist</span>
                </div>
                <div className={styles.privacyPill}>
                  <Lock size={13} />
                  <span>History hidden from others</span>
                </div>
              </div>
            </div>

            <div className={styles.heroActions}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={openEditModal}
                aria-label="Edit profile"
              >
                <Pencil size={15} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleShare}
                aria-label="Share profile"
              >
                <Share2 size={15} />
                <span>Share</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. Horizontal Tabs */}
        <nav className={styles.navTabs} aria-label="Profile navigation">
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "history" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("history")}
          >
            History
            {activeTab === "history" && <span className={styles.tabIndicator} />}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "liked" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("liked")}
          >
            Liked
            {activeTab === "liked" && <span className={styles.tabIndicator} />}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "watchlist" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("watchlist")}
          >
            Watchlist
            {activeTab === "watchlist" && <span className={styles.tabIndicator} />}
          </button>
        </nav>

        {/* 3. Analytics Cards Row (Heatmap + Top Genres) */}
        <section className={styles.analyticsRow}>
          {/* Card 1: Activity Heatmap */}
          <div className={styles.analyticsCard}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Activity</span>
              <span className={styles.cardSub}>{activitySummary}</span>
            </div>

            <div className={styles.heatmapWrap}>
              <div className={styles.heatmapMonths}>
                {MONTHS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
              <div className={styles.heatmapBody}>
                <div className={styles.heatmapDays}>
                  {DAYS.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className={styles.heatmapGrid}>
                  {heatmapData.map((cell, idx) => (
                    <div
                      key={idx}
                      className={`${styles.heatmapCell} ${
                        cell.level === 4
                          ? styles.level4
                          : cell.level === 3
                          ? styles.level3
                          : cell.level === 2
                          ? styles.level2
                          : cell.level === 1
                          ? styles.level1
                          : styles.level0
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.heatmapLegend}>
                <span>Less</span>
                <div className={styles.legendSquares}>
                  <div className={`${styles.legendSquare} ${styles.level0}`} />
                  <div className={`${styles.legendSquare} ${styles.level1}`} />
                  <div className={`${styles.legendSquare} ${styles.level2}`} />
                  <div className={`${styles.legendSquare} ${styles.level3}`} />
                  <div className={`${styles.legendSquare} ${styles.level4}`} />
                </div>
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Card 2: Top Genres */}
          <div className={styles.analyticsCard}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Top genres</span>
              <span className={styles.cardSub}>{genreSummary}</span>
            </div>

            <div className={styles.genresList}>
              <div className={styles.genresTableHead}>
                <span>Titles</span>
                <span>Hours</span>
              </div>

              {genreStats.map((g) => (
                <div key={g.name} className={styles.genreRow}>
                  <span className={styles.genreLabel}>{g.name}</span>
                  <div className={styles.genreBarWrap}>
                    <div
                      className={styles.genreBarFill}
                      style={{ width: `${g.percent}%` }}
                    />
                  </div>
                  <div className={styles.genreStats}>
                    <span className={styles.genreCount}>{g.count}</span>
                    <span className={styles.genreHours}>{g.hours}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.ratioRow}>
              <div className={styles.ratioBar}>
                <div
                  className={styles.ratioMovieSegment}
                  style={{ width: `${ratio.moviePct}%` }}
                />
                <div
                  className={styles.ratioSeriesSegment}
                  style={{ width: `${100 - ratio.moviePct}%` }}
                />
              </div>
              <div className={styles.ratioLabels}>
                <span>{ratio.movies} Movies</span>
                <span>{ratio.series} Series</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Active Tab Content (Media Grid) */}
        <section className={styles.mediaSection}>
          {activeTab === "history" && (
            <div className={styles.mediaGrid}>
              {watchedEntries.map((item) => (
                <MediaCard
                  key={item.id}
                  title={item.title}
                  progress={item.progress}
                  timeLeft={item.timeLeft}
                  wide={true}
                />
              ))}
            </div>
          )}

          {activeTab === "liked" && (
            <div className={styles.mediaGrid}>
              {likedEntries.length > 0 ? (
                likedEntries.map((t) => (
                  <MediaCard key={t.id} title={t} wide={true} />
                ))
              ) : (
                <div className={styles.emptyState}>
                  <p>No liked titles yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "watchlist" && (
            <div className={styles.mediaGrid}>
              {watchlistEntries.length > 0 ? (
                watchlistEntries.map((t) => (
                  <MediaCard key={t.id} title={t} wide={true} />
                ))
              ) : (
                <div className={styles.emptyState}>
                  <p>No titles in your watchlist.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 6. Edit Profile Modal */}
        {isEditing && (
          <div className={styles.modalBackdrop} onClick={() => setIsEditing(false)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <h2 className={styles.modalTitle}>Edit Profile</h2>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setIsEditing(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className={styles.modalForm}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Choose Avatar</label>
                  <div className={styles.avatarPicker}>
                    {PROFILE_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        className={`${styles.avatarOption} ${
                          editAvatar === av.url ? styles.avatarOptionActive : ""
                        }`}
                        onClick={() => setEditAvatar(av.url)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={av.url} alt={av.name} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="edit-name" className={styles.inputLabel}>
                    Profile Name
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={styles.textInput}
                    required
                    maxLength={32}
                  />
                </div>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={editHidden}
                    onChange={(e) => setEditHidden(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>
                    Keep history hidden from others
                  </span>
                </label>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.saveBtn}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 7. Toast Notification */}
        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    </Layout>
  );
}
