import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Header, { MobileNav } from "./Header";
import { BRAND } from "../lib/constants";
import styles from "./Layout.module.css";

// `flush` lets the page start under the header (home hero). Otherwise content is padded below it.
export default function Layout({
  title,
  description,
  image,
  type = "website",
  url,
  flush = false,
  children,
}) {
  const cleanTitle = title ? title.replace(/\s*·\s*(?:Vivarium|DIVINE).*$/i, "").trim() : "";
  const full = cleanTitle ? `${cleanTitle} · ${BRAND.name}` : `${BRAND.name} · ${BRAND.tagline}`;
  const metaDesc = description || "Movies, series and anime in one place.";
  const router = useRouter();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://divine.internal").replace(/\/+$/, "");
  const currentPath = router?.asPath ? router.asPath.split("?")[0] : "";
  const canonicalUrl = url || `${siteUrl}${currentPath === "/" ? "" : currentPath}`;

  return (
    <>
      <Head>
        <title>{full}</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:site_name" content={BRAND.name} />
        <meta property="og:title" content={cleanTitle || BRAND.name} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content={type} />
        <meta property="og:url" content={canonicalUrl} />
        {image && <meta property="og:image" content={image} />}
        <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={cleanTitle || BRAND.name} />
        <meta name="twitter:description" content={metaDesc} />
        {image && <meta name="twitter:image" content={image} />}
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
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <p>
          {BRAND.name} is a curated streaming interface for movies, series, and anime.
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.7 }}>
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="The Movie Database (TMDB)"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brands/tmdb.svg" alt="TMDB Logo" width={80} height={10} style={{ display: "block" }} />
          </a>
        </div>
      </footer>
      <MobileNav />
    </>
  );
}
