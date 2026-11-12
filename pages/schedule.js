import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Bell, Check } from "lucide-react";
import Layout from "../components/Layout";
import { PageHead } from "../components/Page";
import { CertBadge } from "../components/Meta";
import Art from "../components/Art";
import { DAYS, formatDate, getService, TYPE_LABEL } from "../lib/constants";
import { fetchAniListDiscover } from "../lib/anilist";
import { fetchOnTheAir, fetchUpcoming } from "../lib/tmdb";
import { useToast } from "../lib/useToast";
import { useSchedule, toggleScheduleItem } from "../lib/store";
import styles from "../styles/Schedule.module.css";

const DAY_FULL = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

export async function getStaticProps() {
  try {
    const [animeData, showsData, upcomingData] = await Promise.all([
      fetchAniListDiscover({ category: "simulcasts", perPage: 30 }).catch(() => []),
      fetchOnTheAir(1).catch(() => []),
      fetchUpcoming("movie", 1).catch(() => []),
    ]);

    // 1. Map real AniList simulcasts
    const anilistAiring = (Array.isArray(animeData) ? animeData : [])
      .map((a) => {
        if (!a.nextAiringEpisode?.airingAt) return null;
        const d = new Date(a.nextAiringEpisode.airingAt * 1000);
        const airDay = DAYS[d.getDay()];
        const epNum = a.nextAiringEpisode.episode;
        return {
          id: a.id,
          title: a.title?.english || a.title?.romaji || a.title?.userPreferred || a.title,
          type: "anime",
          service: "crunchyroll",
          network: "Crunchyroll",
          poster: a.poster || a.coverImage?.extraLarge || a.coverImage?.large,
          backdrop: a.backdrop || a.bannerImage,
          airDay,
          rating: a.averageScore ? (a.averageScore / 10).toFixed(1) : null,
          episodeBadge: epNum ? `EP ${epNum}` : null,
          nextEpisodeToAir: {
            airDate: d.toISOString(),
            episodeNumber: epNum,
          },
          releaseDate: d.toISOString().split("T")[0],
        };
      })
      .filter((a) => a && a.airDay && DAYS.includes(a.airDay));

    // 2. Map real TMDB TV series currently broadcasting this week
    const tmdbAiring = (Array.isArray(showsData) ? showsData : [])
      .map((t) => {
        const nextEp = t.nextEpisodeToAir;
        if (!nextEp?.airDate) return null;
        const d = new Date(`${nextEp.airDate}T00:00:00Z`);
        const airDay = DAYS[d.getUTCDay()];
        const epBadge =
          nextEp.seasonNumber && nextEp.episodeNumber
            ? `S${nextEp.seasonNumber} E${nextEp.episodeNumber}`
            : "New Ep";
        return {
          id: t.id,
          tmdbId: t.tmdbId,
          title: t.title,
          type: "series",
          service: t.service,
          network: t.network || t.service || "TV",
          poster: t.poster,
          backdrop: t.backdrop,
          airDay,
          rating: t.rating || null,
          episodeBadge: epBadge,
          nextEpisodeToAir: nextEp,
          releaseDate: nextEp.airDate,
        };
      })
      .filter((t) => t && t.airDay && DAYS.includes(t.airDay));

    const combinedAiring = [...anilistAiring, ...tmdbAiring];

    // 3. Real upcoming blockbusters
    const todayStr = new Date().toISOString().split("T")[0];
    const validUpcoming = (Array.isArray(upcomingData) ? upcomingData : [])
      .filter((t) => t.releaseDate && t.releaseDate >= todayStr)
      .sort((a, b) => (a.releaseDate || "").localeCompare(b.releaseDate || ""));

    return {
      props: {
        initialAiring: combinedAiring,
        initialComingSoon: validUpcoming,
      },
      revalidate: 1800,
    };
  } catch (err) {
    return {
      props: {
        initialAiring: [],
        initialComingSoon: [],
      },
      revalidate: 60,
    };
  }
}

function generateIcs(title, dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const start = d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(d.getTime() + 3600000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DIVINE//Air Schedule//EN",
    "BEGIN:VEVENT",
    `SUMMARY:DIVINE: ${title} New Episode`,
    `DESCRIPTION:Stream the latest episode of ${title} on DIVINE.`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export default function Schedule({ initialAiring = [], initialComingSoon = [] }) {
  const [toast, showToast] = useToast(2500);
  const [schedule, setSchedule] = useSchedule();
  const [today, setToday] = useState(null);
  const [airing, setAiring] = useState(initialAiring);
  const [comingSoon, setComingSoon] = useState(initialComingSoon);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToday(DAYS[new Date().getDay()]);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/anilist/discover?category=simulcasts").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/tmdb/discover?category=on_the_air&type=tv").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/tmdb/discover?category=upcoming&type=movie").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([animeData, showsData, upcomingData]) => {
        if (!active) return;

        // Map verified AniList Simulcasts
        const anilistAiring = (Array.isArray(animeData) ? animeData : [])
          .map((a) => {
            if (!a.nextAiringEpisode?.airingAt) return null;
            const d = new Date(a.nextAiringEpisode.airingAt * 1000);
            const airDay = DAYS[d.getDay()];
            const epNum = a.nextAiringEpisode.episode;
            return {
              id: a.id,
              title: a.title?.english || a.title?.romaji || a.title?.userPreferred || a.title,
              type: "anime",
              service: "crunchyroll",
              network: "Crunchyroll",
              poster: a.poster || a.coverImage?.extraLarge || a.coverImage?.large,
              backdrop: a.backdrop || a.bannerImage,
              airDay,
              rating: a.averageScore ? (a.averageScore / 10).toFixed(1) : null,
              episodeBadge: epNum ? `EP ${epNum}` : null,
              nextEpisodeToAir: {
                airDate: d.toISOString(),
                episodeNumber: epNum,
              },
              releaseDate: d.toISOString().split("T")[0],
            };
          })
          .filter((a) => a && a.airDay && DAYS.includes(a.airDay));

        // Map verified TMDB TV Shows currently broadcasting
        const tmdbAiring = (Array.isArray(showsData) ? showsData : [])
          .map((t) => {
            const nextEp = t.nextEpisodeToAir;
            if (!nextEp?.airDate) return null;
            const d = new Date(`${nextEp.airDate}T00:00:00Z`);
            const airDay = DAYS[d.getUTCDay()];
            const epBadge =
              nextEp.seasonNumber && nextEp.episodeNumber
                ? `S${nextEp.seasonNumber} E${nextEp.episodeNumber}`
                : "New Ep";
            return {
              id: t.id,
              tmdbId: t.tmdbId,
              title: t.title,
              type: "series",
              service: t.service,
              network: t.network || t.service || "TV",
              poster: t.poster,
              backdrop: t.backdrop,
              airDay,
              rating: t.rating || null,
              episodeBadge: epBadge,
              nextEpisodeToAir: nextEp,
              releaseDate: nextEp.airDate,
            };
          })
          .filter((t) => t && t.airDay && DAYS.includes(t.airDay));

        // Combine verified anime + shows (deduplicate)
        const seen = new Set();
        const combined = [];
        for (const item of [...anilistAiring, ...tmdbAiring]) {
          if (!item || !item.airDay || !DAYS.includes(item.airDay)) continue;
          const key = String(item.id || item.tmdbId || item.title).toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          combined.push(item);
        }

        if (combined.length > 0) {
          setAiring(combined);
        }

        // Upcoming Blockbusters
        const todayStr = new Date().toISOString().split("T")[0];
        const validUpcoming = (Array.isArray(upcomingData) ? upcomingData : [])
          .filter((t) => t.releaseDate && t.releaseDate >= todayStr)
          .sort((a, b) => (a.releaseDate || "").localeCompare(b.releaseDate || ""));

        if (validUpcoming.length > 0) {
          setComingSoon(validUpcoming);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const isReminded = (id) => {
    return (schedule || []).some((item) => (typeof item === "object" ? item.id : item) === id);
  };

  const handleToggleReminder = (e, t) => {
    e.preventDefault();
    e.stopPropagation();
    const currentlyReminded = isReminded(t.id);
    const titlePayload = {
      id: t.id,
      title: t.title,
      poster: t.poster,
      nextEpisodeToAir: t.nextEpisodeToAir,
      releaseDate: t.releaseDate,
      airDay: t.airDay,
      type: t.type,
      network: t.network,
    };
    toggleScheduleItem(setSchedule, t.id, titlePayload);
    if (!currentlyReminded) {
      showToast(`🔔 Reminder set! You'll be notified when it airs.`);
    } else {
      showToast(`Reminder removed for "${t.title}"`);
    }
  };

  const handleDownloadReminder = (e, t) => {
    e.preventDefault();
    e.stopPropagation();
    const date = t.nextEpisodeToAir?.airDate || t.releaseDate;
    if (!date) return;
    const icsContent = generateIcs(t.title, date);
    if (!icsContent) return;
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-release.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Calendar reminder downloaded for ${t.title}`);
  };

  // Filter by category (all / series / anime)
  const filteredAiring = airing.filter((t) => {
    if (categoryFilter === "series") return t.type === "series" || t.type === "tv";
    if (categoryFilter === "anime") return t.type === "anime";
    return true;
  });

  const seriesCount = airing.filter((t) => t.type === "series" || t.type === "tv").length;
  const animeCount = airing.filter((t) => t.type === "anime").length;

  // Days to render based on selectedDay filter
  const daysToRender = selectedDay === "all" ? DAYS : [selectedDay];

  return (
    <Layout
      title="Schedule · DIVINE"
      description="Live weekly broadcast schedule and upcoming theatrical releases from TMDB and AniList."
    >
      <div className="pageInner">
        <PageHead
          title="Release Schedule"
          sub="Live broadcasting episodes and upcoming theatrical blockbusters fetched directly from official television and streaming networks."
        />

        {/* Minimalist Controls Bar */}
        <div className={styles.controlsBar}>
          {/* Category Filters */}
          <div className={styles.filterBar}>
            <button
              type="button"
              className={`${styles.filterTab} ${categoryFilter === "all" ? styles.filterActive : ""}`}
              onClick={() => setCategoryFilter("all")}
            >
              <span>All Content</span>
              <span className={styles.filterCount}>{airing.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.filterTab} ${categoryFilter === "series" ? styles.filterActive : ""}`}
              onClick={() => setCategoryFilter("series")}
            >
              <span>TV Shows</span>
              <span className={styles.filterCount}>{seriesCount}</span>
            </button>
            <button
              type="button"
              className={`${styles.filterTab} ${categoryFilter === "anime" ? styles.filterActive : ""}`}
              onClick={() => setCategoryFilter("anime")}
            >
              <span>Anime</span>
              <span className={styles.filterCount}>{animeCount}</span>
            </button>
          </div>

          {/* Day Navigation Ribbon */}
          <div className={styles.dayRibbon}>
            <button
              type="button"
              className={`${styles.dayTab} ${selectedDay === "all" ? styles.dayTabActive : ""}`}
              onClick={() => setSelectedDay("all")}
            >
              <span>All Week</span>
              <span className={styles.dayTabCount}>{filteredAiring.length}</span>
            </button>
            {DAYS.map((d) => {
              const dayCount = filteredAiring.filter((t) => t.airDay === d).length;
              const isToday = today === d;
              return (
                <button
                  key={d}
                  type="button"
                  className={`${styles.dayTab} ${selectedDay === d ? styles.dayTabActive : ""} ${
                    isToday ? styles.dayTabToday : ""
                  }`}
                  onClick={() => setSelectedDay(d)}
                >
                  <span>{d}</span>
                  {isToday && <span>•</span>}
                  <span className={styles.dayTabCount}>{dayCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule Day Sections */}
        <div className={styles.scheduleContainer}>
          {daysToRender.map((d) => {
            const items = filteredAiring.filter((t) => t.airDay === d);
            const isToday = today === d;
            if (items.length === 0 && selectedDay === "all") return null;

            return (
              <section
                key={d}
                className={`${styles.daySection} ${isToday ? styles.todaySection : ""}`}
              >
                <div className={styles.dayHeader}>
                  <div className={styles.dayHeaderLeft}>
                    <h2 className={styles.dayName}>{DAY_FULL[d] || d}</h2>
                    {isToday && <span className={styles.todayPill}>Today</span>}
                    <span className={styles.dayItemCount}>
                      {items.length} {items.length === 1 ? "episode airing" : "episodes airing"}
                    </span>
                  </div>
                  {selectedDay === "all" ? (
                    <button
                      type="button"
                      className={styles.focusDayBtn}
                      onClick={() => setSelectedDay(d)}
                      title={`Focus on ${DAY_FULL[d]}`}
                    >
                      Focus {d} &rarr;
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.focusDayBtn}
                      onClick={() => setSelectedDay("all")}
                      title="Show all days"
                    >
                      &larr; Show all week
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className={styles.emptyDay}>
                    <p>Loading schedule…</p>
                  </div>
                ) : items.length ? (
                  <div className={styles.cardsGrid}>
                    {items.map((t) => (
                      <Link
                        key={t.id || t.tmdbId}
                        href={`/title/${t.id}`}
                        className={styles.card}
                      >
                        <div className={styles.posterWrapper}>
                          <Art
                            title={t}
                            variant="poster"
                            showTitle={false}
                            className={styles.posterImg}
                          />
                          {t.rating && (
                            <span className={styles.posterRating}>
                              ★ {t.rating}
                            </span>
                          )}
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.cardTop}>
                            <b className={styles.cardTitle} title={t.title}>
                              {t.title}
                            </b>
                            {t.episodeBadge && (
                              <span
                                className={`${styles.epBadge} ${
                                  t.type === "anime" ? styles.epBadgeAnime : ""
                                }`}
                              >
                                {t.episodeBadge}
                              </span>
                            )}
                          </div>
                          <div className={styles.cardMeta}>
                            <span className={styles.serviceTag}>
                              {[
                                TYPE_LABEL[t.type] || (t.type === "anime" ? "Anime" : "Series"),
                                t.network || getService(t.service)?.name,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </div>
                          <div className={styles.cardBottom}>
                            <button
                              type="button"
                              className={`${styles.remindBtnSmall} ${
                                isReminded(t.id) ? styles.remindBtnActive : ""
                              }`}
                              onClick={(e) => handleToggleReminder(e, t)}
                              title={
                                isReminded(t.id)
                                  ? "In-app reminder set (click to remove)"
                                  : "Notify me when this episode airs"
                              }
                              aria-label={
                                isReminded(t.id)
                                  ? `Reminded for ${t.title}`
                                  : `Remind me about ${t.title}`
                              }
                            >
                              {isReminded(t.id) ? (
                                <>
                                  <Check size={12} strokeWidth={2.6} />
                                  <span>Reminded</span>
                                </>
                              ) : (
                                <>
                                  <Bell size={12} />
                                  <span>Remind me</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className={styles.icsDownloadBtn}
                              onClick={(e) => handleDownloadReminder(e, t)}
                              title="Export event to calendar (.ics)"
                              aria-label={`Export .ics calendar file for ${t.title}`}
                            >
                              <Calendar size={11} />
                              <span>.ics</span>
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyDay}>
                    <p>No episodes scheduled for {DAY_FULL[d] || d}.</p>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Upcoming Blockbusters Section with Posters */}
        <h2 className={styles.h2}>Upcoming Blockbusters</h2>
        <div className={styles.soonList}>
          {comingSoon.map((t) => (
            <div key={t.id || t.tmdbId} className={styles.soonRow}>
              <div className={styles.soonPoster}>
                <Art
                  title={t}
                  variant="poster"
                  showTitle={false}
                  className={styles.soonPosterImg}
                />
              </div>
              <time className={styles.soonDate}>{formatDate(t.releaseDate)}</time>
              <Link href={`/title/${t.id}`} className={styles.soonTitleLink}>
                <b>{t.title}</b>
              </Link>
              <span className={styles.soonGenres}>
                {t.genres?.slice(0, 2).join(", ") || t.type}
              </span>
              {t.cert ? <CertBadge cert={t.cert} /> : <span />}
              <div className={styles.soonActions}>
                <button
                  type="button"
                  className={`${styles.remindBtn} ${
                    isReminded(t.id) ? styles.remindBtnActive : ""
                  }`}
                  onClick={(e) => handleToggleReminder(e, t)}
                  title={
                    isReminded(t.id)
                      ? "In-app reminder set (click to remove)"
                      : "Notify me on release date"
                  }
                  aria-label={
                    isReminded(t.id)
                      ? `Reminded for ${t.title}`
                      : `Remind me about ${t.title}`
                  }
                >
                  {isReminded(t.id) ? (
                    <>
                      <Check size={13} strokeWidth={2.6} />
                      <span>Reminded</span>
                    </>
                  ) : (
                    <>
                      <Bell size={13} />
                      <span>Remind me</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.icsDownloadBtn}
                  onClick={(e) => handleDownloadReminder(e, t)}
                  title="Export to Calendar (.ics)"
                  aria-label={`Export .ics file for ${t.title}`}
                >
                  <Calendar size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && <div className={styles.toastNotice}>{toast}</div>}
    </Layout>
  );
}
