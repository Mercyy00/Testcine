import Link from "next/link";
import { Compass, Home } from "lucide-react";
import Layout from "../components/Layout";

export default function NotFound() {
  return (
    <Layout title="Page not found">
      <div
        className="pageInner"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          minHeight: "70vh",
          paddingBlock: "64px 80px",
          position: "relative",
        }}
      >
        {/* Ambient warm glow behind graphic */}
        <div
          style={{
            position: "absolute",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 122, 48, 0.16) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        {/* Floating DIVINE leaf graphic */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/loader-leaf.png"
            alt="DIVINE"
            style={{
              width: 88,
              height: "auto",
              filter: "drop-shadow(0 8px 24px rgba(255, 122, 48, 0.45))",
            }}
          />
        </div>

        <p
          style={{
            position: "relative",
            zIndex: 1,
            margin: "0 0 6px",
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--brand-amber, #ff7a30)",
          }}
        >
          404 · Lost In Cinema
        </p>

        <h1
          className="pageTitle"
          style={{
            position: "relative",
            zIndex: 1,
            margin: "0 0 12px",
            fontSize: "clamp(26px, 4vw, 38px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          This title or page does not exist
        </h1>

        <p
          style={{
            position: "relative",
            zIndex: 1,
            margin: "0 auto 28px",
            fontSize: 16,
            color: "var(--text-soft, rgba(255, 255, 255, 0.65))",
            maxWidth: "52ch",
            lineHeight: 1.6,
          }}
        >
          The link may have expired or been moved. Explore our latest featured releases or return home to keep streaming.
        </p>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <Link href="/" className="btn btnPrimary btnMd" style={{ textDecoration: "none" }}>
            <Home size={17} />
            <span>Return Home</span>
          </Link>
          <Link href="/discover" className="btn btnGlass btnMd" style={{ textDecoration: "none" }}>
            <Compass size={17} />
            <span>Discover Titles</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
