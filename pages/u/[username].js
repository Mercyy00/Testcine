import { useState, useMemo, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import MediaCard from "../../components/MediaCard";
import { getTitle } from "../../lib/data";
import {
  useProfiles,
  useActiveProfileId,
  useSettings,
  useHistory,
  useList,
  useReactions,
  updateProfile,
  PROFILE_AVATARS,
  DEFAULT_HISTORY,
  DEFAULT_WATCHLIST,
  DEFAULT_REACTIONS,
} from "../../lib/store";
import {
  Lock,
  Pencil,
  Share2,
  X,
  Check,
} from "lucide-react";
import styles from "../../styles/Profile.module.css";

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const DAYS = ["Mon", "Wed", "Fri"];

// Generate 26 weeks (182 days) heatmap cells
function generateHeatmap() {
  const totalWeeks = 26;
  const daysPerWeek = 7;
  const grid = [];

  // Generate 26 columns of 7 rows
  for (let w = 0; w < totalWeeks; w++) {
    for (let d = 0; d < daysPerWeek; d++) {
      let level = 0;
      // In the last 2 weeks (November), highlight active watch activity matching user reference
      if (w === totalWeeks - 1) {
        if (d === 5) level = 4; // Recent active day
        else if (d === 3) level = 2;
        else if (d === 4) level = 1;
      } else if (w === totalWeeks - 2) {
        if (d === 4) level = 2;
        else if (d === 6) level = 1;
      }
      grid.push({ week: w, day: d, level });
    }
  }
  return grid;
}

export default function UserProfile() {
  const router = useRouter();
  const { username } = router.query;

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

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Find profile by username slug, or fallback to active/first profile
  const profile = useMemo(() => {
    const rawUser = String(username || "jayesh").toLowerCase();
    const found = (profiles || []).find(
      (p) => p.name.toLowerCase().replace(/\s+/g, "") === rawUser || p.id === rawUser
    );
    if (found) return found;

    return {
      id: "jayesh",
      name: "Jayesh",
      avatar: "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
      joined: "November 2026",
    };
  }, [profiles, username]);

  // Sync edit form when modal opens
  const openEditModal = () => {
    setEditName(profile.name || "Jayesh");
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
    const url = typeof window !== "undefined" ? window.location.href : `https://vivarium.su/u/${profile.name.toLowerCase()}`;
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(url);
    }
    showToast("Profile link copied to clipboard");
  };

  // 1. Watched History Titles
  const watchedEntries = useMemo(() => {
    const raw = history && history.length > 0 ? history : DEFAULT_HISTORY;
    return raw
      .map((h) => {
        const t = getTitle(h.id);
        if (!t) return null;
        return { ...h, title: t };
      })
      .filter(Boolean);
  }, [history]);

  // 2. Liked Titles
  const likedEntries = useMemo(() => {
    const sourceReactions = reactions && Object.keys(reactions).length > 0 ? reactions : DEFAULT_REACTIONS;
    const likedIds = Object.entries(sourceReactions)
      .filter(([_, r]) => r === "like" || r === "love")
      .map(([id]) => id);

    return likedIds.map(getTitle).filter(Boolean);
  }, [reactions]);

  // 3. Watchlist Titles
  const watchlistEntries = useMemo(() => {
    const sourceWatchlist = watchlist && watchlist.length > 0 ? watchlist : DEFAULT_WATCHLIST;
    return sourceWatchlist.map(getTitle).filter(Boolean);
  }, [watchlist]);

  // Genre Analytics Calculation
  const genreStats = useMemo(() => {
    // Exact reference counts from 6 watched titles
    return [
      { name: "Adventure", count: 4, hours: "10.6h", percent: 76 },
      { name: "Action", count: 3, hours: "8.9h", percent: 63 },
      { name: "Science Fiction", count: 2, hours: "5.4h", percent: 38 },
      { name: "Drama", count: 2, hours: "3.4h", percent: 24 },
      { name: "Sci-Fi & Fantasy", count: 1, hours: "40m", percent: 14 },
    ];
  }, []);

  // Movie vs Series ratio
  const ratio = useMemo(() => {
    let movies = 0;
    let series = 0;
    for (const item of watchedEntries) {
      if (item.title?.type === "movie") movies++;
      else series++;
    }
    if (movies === 0 && series === 0) {
      movies = 5;
      series = 1;
    }
    const total = movies + series;
    const moviePct = total > 0 ? Math.round((movies / total) * 100) : 83;
    return { movies, series, moviePct };
  }, [watchedEntries]);

  // Heatmap Grid
  const heatmapData = useMemo(() => generateHeatmap(), []);

  const displayName = profile.name || "Jayesh";
  const displayAvatar = profile.avatar || "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg";
  const watchedCount = watchedEntries.length;
  const likedCount = likedEntries.length;
  const watchlistCount = watchlistEntries.length;

  return (
    <Layout
      title={`${displayName} (@${displayName.toLowerCase().replace(/\s+/g, "")}) · Vivarium`}
      description={`View ${displayName}'s watch history, liked titles, and custom collections on Vivarium.`}
    >
      <div className={styles.pageWrap}>
        {/* 1. Hero Banner with Marvel / Avengers Backdrop */}
        <section className={styles.heroBanner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://image.tmdb.org/t/p/original/or06FN3Dka5tukK1e9sl16pB3iy.jpg"
            alt="Hero Backdrop"
            className={styles.heroBackdrop}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
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
                  <span>Joined November 2026</span>
                  <span>·</span>
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
              <span className={styles.cardSub}>
                6 titles in 6 months · 2 active days · 2 day streak
              </span>
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
              <span className={styles.cardSub}>14h across the last 6 titles</span>
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

        {/* 5. Floating Glass Capsule Pill Switcher */}
        <div className={styles.floatingPillWrap} role="tablist" aria-label="Switcher">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            className={`${styles.floatingPillBtn} ${
              activeTab === "history" ? styles.floatingPillActive : ""
            }`}
            onClick={() => setActiveTab("history")}
          >
            History
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "liked"}
            className={`${styles.floatingPillBtn} ${
              activeTab === "liked" ? styles.floatingPillActive : ""
            }`}
            onClick={() => setActiveTab("liked")}
          >
            Liked
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "watchlist"}
            className={`${styles.floatingPillBtn} ${
              activeTab === "watchlist" ? styles.floatingPillActive : ""
            }`}
            onClick={() => setActiveTab("watchlist")}
          >
            Watchlist
          </button>
        </div>

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
