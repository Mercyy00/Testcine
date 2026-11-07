import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import { PageHead } from "../components/Page";
import { CertBadge } from "../components/Meta";
import { DAYS, formatDate, getService, TYPE_LABEL } from "../lib/constants";
import { getSchedulePageData } from "../lib/data.server";
import styles from "../styles/Schedule.module.css";

export async function getStaticProps() {
  const data = getSchedulePageData();
  return {
    props: {
      ...data,
    },
    revalidate: 1800,
  };
}

const JS_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Schedule({ airing = [], comingSoon = [] }) {
  const [today, setToday] = useState(null);
  useEffect(() => setToday(JS_DAY[new Date().getDay()]), []);

  return (
    <Layout title="Schedule" description="What airs this week and what is coming soon.">
      <div className="pageInner">
        <PageHead title="Schedule" sub="Weekly episodes are listed by the day they land." />

        <div className={styles.week}>
          {DAYS.map((d) => {
            const items = airing.filter((t) => t.airDay === d);
            return (
              <section key={d} className={`${styles.day} ${today === d ? styles.today : ""}`}>
                <h2>
                  {d}
                  {today === d && <span>Today</span>}
                </h2>
                {items.length ? (
                  items.map((t) => (
                    <Link key={t.id} href={`/title/${t.id}`} className={styles.item}>
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
            <li key={t.id}>
              <time dateTime={t.releaseDate}>{formatDate(t.releaseDate)}</time>
              <Link href={`/title/${t.id}`}>{t.title}</Link>
              <span>{TYPE_LABEL[t.type]}</span>
              <CertBadge cert={t.cert} small />
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
