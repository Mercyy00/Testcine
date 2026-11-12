import { useState, useMemo, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
import { AVATAR_CATEGORIES } from "../../lib/avatars";
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
  const { data: session } = useSession();
  const [settings, setSettings] = useSettings();
  const [history] = useHistory();
  const [watchlist] = useList();
  const [reactions] = useReactions();

  // Remote user state from DB
  const [remoteUser, setRemoteUser] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !username) return;
    let active = true;
    setRemoteLoading(true);
    fetch(`/api/user/profile?username=${encodeURIComponent(username)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) {
          setRemoteUser(d);
          setRemoteLoading(false);
        }
      })
      .catch(() => {
        if (active) setRemoteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router.isReady, username]);

  // Active Tab: "history" | "liked" | "watchlist"
  const [activeTab, setActiveTab] = useState("history");

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [avatarCategory, setAvatarCategory] = useState("All");
  const [editBio, setEditBio] = useState("");

  const visibleAvatars =
    avatarCategory === "All"
      ? PROFILE_AVATARS
      : PROFILE_AVATARS.filter((a) => a.category === avatarCategory);
  const [editPublic, setEditPublic] = useState(true);
  const [editHidden, setEditHidden] = useState(false);

  // Toast with auto-cleanup
  const [toast, showToast] = useToast(2500);

  // Find profile by username slug, or fallback to active/first profile
  const profile = useMemo(() => {
    if (remoteUser && !remoteUser.locked) {
      return {
        id: remoteUser.id,
        name: remoteUser.name || remoteUser.username || "User",
        avatar: remoteUser.image || DEFAULT_AVATAR,
        bio: remoteUser.bio || "",
        createdAt: remoteUser.createdAt,
        isPublic: remoteUser.isPublic !== false,
      };
    }
    const rawUser = String(username || "guest").toLowerCase();
    const found = (profiles || []).find(
      (p) => p.name.toLowerCase().replace(/\s+/g, "") === rawUser || p.id === rawUser
    );
    if (found) return found;

    return {
      id: "guest",
      name: "Guest",
      avatar: DEFAULT_AVATAR,
      bio: "",
      isPublic: true,
    };
  }, [remoteUser, profiles, username]);

  const isOwner = useMemo(() => {
    if (session?.user?.id && remoteUser?.id) return session.user.id === remoteUser.id;
    if (session?.user?.name && profile.name) return session.user.name.toLowerCase() === profile.name.toLowerCase();
    return true; // Local guest mode allows editing local profile
  }, [session, remoteUser, profile.name]);

  // Sync edit form when modal opens
  const openEditModal = () => {
    setEditName(profile.name || "Guest");
    setEditAvatar(profile.avatar || PROFILE_AVATARS[0].url);
    setEditBio(profile.bio || "");
    setEditPublic(profile.isPublic !== false);
    setEditHidden(settings.historyHidden !== false);
    setIsEditing(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const trimmed = (editName || "").trim();
    if (!trimmed) return;

    // 1. Update local state
    updateProfile(setProfiles, profile.id, {
      name: trimmed,
      avatar: editAvatar,
    });

    setSettings((s) => ({
      ...s,
      name: trimmed,
      avatar: editAvatar,
      bio: editBio,
      historyHidden: editHidden,
    }));

    // 2. Persist to DB via API if logged in
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          image: editAvatar,
          bio: editBio.slice(0, 160),
          isPublic: editPublic,
        }),
      });
    } catch {}

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

  // Effective history: remote user history when viewing another user, otherwise local history
  const effectiveHistory = useMemo(() => {
    if (remoteUser && !isOwner) {
      return (remoteUser.watchHistory || []).map((h) => ({
        id: h.titleId,
        at: h.watchedAt ? new Date(h.watchedAt).getTime() : Date.now(),
        progress: h.progress ?? 1,
      }));
    }
    return history || [];
  }, [remoteUser, isOwner, history]);

  // 1. Watched History Titles
  const watchedEntries = useMemo(() => {
    if (remoteUser && !isOwner) {
      return (remoteUser.watchHistory || [])
        .map((h) => {
          const t = h.titleData || resolveTitle(h.titleId);
          if (!t) return null;
          return {
            ...h,
            id: h.titleId,
            at: h.watchedAt ? new Date(h.watchedAt).getTime() : Date.now(),
            title: t,
          };
        })
        .filter(Boolean);
    }
    const raw = history || [];
    return raw
      .map((h) => {
        const t = resolveTitle(h.id);
        if (!t) return null;
        return { ...h, title: t };
      })
      .filter(Boolean);
  }, [remoteUser, isOwner, history, cardMap]);

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
    if (remoteUser && !isOwner) {
      return (remoteUser.watchlist || [])
        .map((w) => w.titleData || resolveTitle(w.titleId))
        .filter(Boolean);
    }
    const sourceWatchlist = watchlist || [];
    return sourceWatchlist.map(resolveTitle).filter(Boolean);
  }, [remoteUser, isOwner, watchlist, cardMap]);

  // Dynamic Genre Analytics Calculation
  const genreStats = useMemo(() => {
    const counts = {};
    const minutes = {};
    const timedTitles = {};
    let totalMinutes = 0;
    let totalTitles = 0;

    for (const item of watchedEntries) {
      const t = item.title;
      if (!t) continue;
      const progress = Number(item.progress);
      const itemMinutes = t.runtime && Number.isFinite(progress) ? t.runtime * progress : null;
      totalTitles += 1;
      if (itemMinutes !== null) totalMinutes += itemMinutes;
      for (const g of t.genres || []) {
        counts[g] = (counts[g] || 0) + 1;
        if (itemMinutes !== null) {
          minutes[g] = (minutes[g] || 0) + itemMinutes;
          timedTitles[g] = (timedTitles[g] || 0) + 1;
        }
      }
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return [];

    return sorted.slice(0, 5).map(([name, count]) => {
      const mins = minutes[name] || 0;
      const hours = timedTitles[name]
        ? mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${Math.round(mins)}m`
        : "—";
      const percent = totalMinutes > 0
        ? Math.min(100, Math.round((mins / totalMinutes) * 100))
        : Math.round((count / totalTitles) * 100);
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
    const knownEntries = watchedEntries.filter((item) => item.title?.runtime && Number.isFinite(Number(item.progress)));
    const mins = knownEntries.reduce((total, item) => total + item.title.runtime * Number(item.progress), 0);
    if (!knownEntries.length) return `${watchedEntries.length} ${watchedEntries.length === 1 ? "title" : "titles"} watched`;
    return `${Math.round(mins / 60)}h across ${watchedEntries.length} ${watchedEntries.length === 1 ? "title" : "titles"}`;
  }, [watchedEntries]);

  // Heatmap Grid
  const heatmapData = useMemo(() => generateHeatmap(effectiveHistory), [effectiveHistory]);

  const displayName = profile.name || "Guest";
  const displayAvatar = profile.avatar || DEFAULT_AVATAR;
  const watchedCount = watchedEntries.length;
  const likedCount = likedEntries.length;
  const watchlistCount = watchlistEntries.length;

  const joinedDateStr = useMemo(() => {
    const d = remoteUser?.createdAt || profile?.createdAt;
    if (!d) return "Join date unavailable";
    try {
      return `Joined ${new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
    } catch {
      return "Join date unavailable";
    }
  }, [remoteUser?.createdAt, profile?.createdAt]);

  const activitySummary = useMemo(() => {
    const totalWatched = watchedEntries.length;
    const dateMap = new Set();
    const dayMs = 24 * 60 * 60 * 1000;
    (effectiveHistory || []).forEach((h) => {
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
      description={`View ${displayName}'s watch history, liked titles, and custom collections on DIVINE.`}
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
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <h1 className={styles.profileName}>{displayName}</h1>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    {joinedDateStr}
                  </span>
                </div>
                {profile.bio && (
                  <p style={{ margin: "4px 0 8px", color: "rgba(255,255,255,0.8)", fontSize: 14, maxWidth: 500 }}>
                    {profile.bio}
                  </p>
                )}
                {!remoteUser?.locked && (
                  <div className={styles.statsRow}>
                    <span>{watchedCount} watched</span>
                    <span>·</span>
                    <span>{likedCount} liked</span>
                    <span>·</span>
                    <span>{watchlistCount} in watchlist</span>
                  </div>
                )}
                <div className={styles.privacyPill}>
                  <Lock size={13} />
                  <span>
                    {remoteUser?.locked
                      ? "Private Profile"
                      : profile.isPublic
                      ? "Public Profile"
                      : "Private Profile"}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.heroActions}>
              {isOwner && (
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={openEditModal}
                  aria-label="Edit profile"
                >
                  <Pencil size={15} />
                  <span>Edit</span>
                </button>
              )}
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

        {/* 2. Horizontal Tabs & Analytics (Hidden if Private) */}
        {remoteUser?.locked ? (
          <div style={{ textAlign: "center", padding: "100px 24px 140px", color: "rgba(255,255,255,0.7)" }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 20px",
              }}
            >
              <Lock size={32} opacity={0.6} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>
              This profile is private
            </h2>
            <p style={{ fontSize: 14, margin: 0, maxWidth: 360, marginInline: "auto", lineHeight: 1.5 }}>
              Only @{displayName} can view their watched titles, lists, and activity history.
            </p>
          </div>
        ) : (
          <>
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
        </>
        )}

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
                  <div className={styles.avatarCategoryTabs}>
                    {AVATAR_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`${styles.avatarCategoryTab} ${
                          avatarCategory === cat ? styles.avatarCategoryTabActive : ""
                        }`}
                        onClick={() => setAvatarCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className={styles.avatarPicker}>
                    {visibleAvatars.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        className={`${styles.avatarOption} ${
                          editAvatar === av.url ? styles.avatarOptionActive : ""
                        }`}
                        onClick={() => setEditAvatar(av.url)}
                        title={`${av.name} (${av.subtitle})`}
                        aria-label={`${av.name} (${av.subtitle})`}
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

                <div className={styles.inputGroup}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="edit-bio" className={styles.inputLabel}>
                      Bio
                    </label>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      {editBio.length}/160
                    </span>
                  </div>
                  <textarea
                    id="edit-bio"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value.slice(0, 160))}
                    rows={3}
                    placeholder="Tell the community what movies or anime you like..."
                    className={styles.textInput}
                    style={{ resize: "none", fontFamily: "inherit" }}
                  />
                </div>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={editPublic}
                    onChange={(e) => setEditPublic(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>
                    Public Profile (allow visitors to view your profile)
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
