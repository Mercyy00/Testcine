import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import Layout from "../components/Layout";
import { PageHead } from "../components/Page";
import { CertBadge } from "../components/Meta";
import { DAYS, formatDate, getService, TYPE_LABEL } from "../lib/constants";
import { useToast } from "../lib/useToast";
import styles from "../styles/Schedule.module.css";

export async function getStaticProps() {
  return {
    props: {},
    revalidate: 1800,
  };
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

export default function Schedule() {
  const [toast, showToast] = useToast(2500);
  const [today, setToday] = useState(null);
  const [airing, setAiring] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setToday(JS_DAY[new Date().getDay()]);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/tmdb/discover?category=on_the_air&type=tv").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/tmdb/discover?category=upcoming&type=movie").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([airingData, upcomingData]) => {
        if (active) {
          const mappedAiring = (Array.isArray(airingData) ? airingData : [])
            .filter((title) => title.airDay && DAYS.includes(title.airDay));
          setAiring(mappedAiring);
          const todayStr = new Date().toISOString().split("T")[0];
          const futureOnly = (Array.isArray(upcomingData) ? upcomingData : [])
            .filter((t) => t.releaseDate && t.releaseDate >= todayStr);
          setComingSoon(futureOnly.length > 0 ? futureOnly : (Array.isArray(upcomingData) ? upcomingData : []));
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDownloadReminder = (e, t) => {
    e.preventDefault();
    e.stopPropagation();
    const icsContent = generateIcs(t.title, t.nextEpisodeToAir?.airDate);
    if (!icsContent) return;
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.title.toLowerCase().replace(/\s+/g, "-")}-airing.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Calendar reminder downloaded for ${t.title}`);
  };

  return (
    <Layout
      title="Schedule · DIVINE"
      description="What airs this week and upcoming blockbuster releases dynamically from TMDB."
    >
      <div className="pageInner">
        <PageHead
          title="Schedule"
          sub="Weekly episodes and upcoming releases fetched directly from TMDB in your local timezone."
        />

        <div className={styles.week}>
          {DAYS.map((d) => {
            const items = airing.filter((t) => t.airDay === d);
            const isToday = today === d;
            return (
              <section key={d} className={`${styles.day} ${isToday ? styles.today : ""}`}>
                <h2>
                  {d}
                  {isToday && <span>Today</span>}
                </h2>
                {loading ? (
                  <p className={styles.none}>Loading…</p>
                ) : items.length ? (
                  items.map((t) => (
                    <Link key={t.id || t.tmdbId} href={`/title/${t.id}`} className={styles.item}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                        <b>{t.title}</b>
                      </div>
                      <small>
                        {[TYPE_LABEL[t.type], getService(t.service)?.name].filter(Boolean).join(" · ")}
                      </small>
                      {t.nextEpisodeToAir?.airDate && <button
                        type="button"
                        onClick={(e) => handleDownloadReminder(e, t)}
                        style={{
                          marginTop: 6,
                          background: "none",
                          border: "none",
                          color: "var(--text-soft)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "11px",
                          padding: 0,
                        }}
                        title="Add to Calendar (.ics)"
                      >
                        <Calendar size={12} />
                        <span>Remind me (.ics)</span>
                      </button>}
                    </Link>
                  ))
                ) : (
                  <p className={styles.none}>No episodes</p>
                )}
              </section>
            );
          })}
        </div>

        {/* Upcoming Movies Row */}
        <h2 className={styles.h2}>Upcoming Blockbusters</h2>
        <ul className={styles.soon}>
          {comingSoon.map((t) => (
            <li key={t.id || t.tmdbId}>
              <time>{formatDate(t.releaseDate)}</time>
              <Link href={`/title/${t.id}`}>
                <b>{t.title}</b>
              </Link>
              <span>{t.genres?.slice(0, 2).join(", ") || t.type}</span>
              <span>{t.cert ? <CertBadge cert={t.cert} /> : null}</span>
            </li>
          ))}
        </ul>
      </div>

      {toast && <div className={styles.toastNotice}>{toast}</div>}
    </Layout>
  );
}
