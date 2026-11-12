import { getAllCardTitles } from "../lib/data.server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://divine.internal";

function generateSiteMap(titles) {
  const staticPages = [
    "",
    "/movies",
    "/series",
    "/anime",
    "/discover",
    "/schedule",
    "/watch-party",
    "/privacy",
    "/terms",
    "/dmca",
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map((path) => {
    return `  <url>
    <loc>${SITE_URL}${path}</loc>
    <changefreq>daily</changefreq>
    <priority>${path === "" ? "1.0" : "0.8"}</priority>
  </url>`;
  })
  .join("\n")}
${(titles || [])
  .map((t) => {
    return `  <url>
    <loc>${SITE_URL}/title/${t.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  const titles = getAllCardTitles();
  const sitemap = generateSiteMap(titles);

  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=43200");
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default function SiteMap() {
  return null;
}
