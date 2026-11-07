import Link from "next/link";
import Layout from "../components/Layout";

export default function NotFound() {
  return (
    <Layout title="Page not found">
      <div className="pageInner" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14, paddingBlock: "60px" }}>
        <p style={{ margin: 0, fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>404</p>
        <h1 className="pageTitle">That page is not in the catalogue</h1>
        <p style={{ margin: "0 0 10px", fontSize: 17, color: "var(--text-dim)", maxWidth: "50ch", lineHeight: 1.5 }}>
          The link may be old or mistyped. Head back home or search for a title.
        </p>
        <Link href="/" className="btnHero">
          Back to home
        </Link>
      </div>
    </Layout>
  );
}
