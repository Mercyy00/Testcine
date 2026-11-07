import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import { PageHead } from "../components/Page";
import { CertBadge } from "../components/Meta";
import { DAYS, formatDate, getService, TYPE_LABEL } from "../lib/constants";
import styles from "../styles/Schedule.module.css";

export async function getStaticProps() {
  return {
    props: {},
    revalidate: 1800,
  };
}

const JS_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Schedule() {
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
          const mappedAiring = (Array.isArray(airingData) ? airingData : []).map((t, idx) => {
            if (t.airDay) return t;
            let day = null;
            if (t.releaseDate || t.firstAirDate) {
              const dt = new Date(t.releaseDate || t.firstAirDate);
              if (!Number.isNaN(dt.getTime())) {
                day = JS_DAY[dt.getDay()];
              }
            }
            if (!day || !DAYS.includes(day)) {
              day = DAYS[idx % DAYS.length];
            }
            return { ...t, airDay: day };
          });
          setAiring(mappedAiring);
          setComingSoon(Array.isArray(upcomingData) ? upcomingData : []);
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

  return (
    <Layout title="Schedule" description="What airs this week and what is coming soon dynamically from TMDB.">
      <div className="pageInner">
        <PageHead title="Schedule" sub="Weekly episodes and upcoming releases fetched directly from TMDB." />

        <div className={styles.week}>
          {DAYS.map((d) => {
            const items = airing.filter((t) => t.airDay === d);
            return (
              <section key={d} className={`${styles.day} ${today === d ? styles.today : ""}`}>
                <h2>
                  {d}
                  {today === d && <span>Today</span>}
                </h2>
                {loading ? (
                  <p className={styles.none}>Loading...</p>
                ) : items.length ? (
                  items.map((t) => (
                    <Link key={t.id || t.tmdbId} href={`/title/${t.id}`} className={styles.item}>
                      <b>{t.title}</b>
                      <small>
                        {TYPE_LABEL[t.type] || "Title"} · {getService(t.service)?.name || "Vivarium"}
                      </small>
                    </Link>
                  ))
                ) : (
                  <p className={styles.none}>No episodes</p>
                )}
              </section>
            );
          })}
        </div>

        <h2 className={styles.h2}>Coming soon</h2>
        <ul className={styles.soon}>
          {comingSoon.map((t) => (
            <li key={t.id || t.tmdbId}>
              <Link href={`/title/${t.id}`}>
                <span className={styles.date}>{formatDate(t.releaseDate)}</span>
                <span className={styles.title}>{t.title}</span>
                <CertBadge cert={t.cert} />
                <span className={styles.type}>{TYPE_LABEL[t.type]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
