import Head from "next/head";
import Link from "next/link";
import Header, { MobileNav } from "./Header";
import { BRAND } from "../lib/data";
import styles from "./Layout.module.css";

// `flush` lets the page start under the header (home hero). Otherwise content is padded below it.
export default function Layout({ title, description, flush = false, children }) {
  const full = title ? `${title} · ${BRAND.name}` : `${BRAND.name} · ${BRAND.tagline}`;
  return (
    <>
      <Head>
        <title>{full}</title>
        <meta name="description" content={description || "Movies, series and anime in one place."} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <div className={styles.mood} aria-hidden="true" />
      <Header />
      <main className={`pageShell ${flush ? "" : styles.padded}`}>{children}</main>
      <footer className={styles.footer}>
        <div className={styles.links}>
          <Link href="/discover">Discover</Link>
          <Link href="/schedule">Schedule</Link>
          <Link href="/watch-party">Watch party</Link>
          <Link href="/settings">Settings</Link>
        </div>
        <p>
          {BRAND.name} · Stream movies, series, and anime with real-time metadata and high-definition streams powered by TMDB.
        </p>
      </footer>
      <MobileNav />
    </>
  );
}
