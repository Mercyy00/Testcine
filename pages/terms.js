import Layout from "../components/Layout";
import { BRAND } from "../lib/constants";

export default function TermsPage() {
  return (
    <Layout title="Terms of Service" description={`Terms of Service for ${BRAND.name}: platform usage rules and legal attribution.`}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px var(--page-pad) 96px" }}>
        <h1 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.5 }}>
          Terms of Service
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, margin: "0 0 36px" }}>
          Effective Date: January 1, 2026
        </p>

        <div style={{ display: "grid", gap: 32, fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>
          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>1. Acceptance of Terms</h2>
            <p>
              By accessing or using {BRAND.name}, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may discontinue use of the platform at any time.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>2. Metadata & Trademark Notice</h2>
            <p>
              This product uses the TMDB API but is not endorsed or certified by TMDB. All movie, television series, anime titles, logos, posters, and imagery displayed on {BRAND.name} belong to their respective copyright holders and studios.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>3. Permitted Personal Use</h2>
            <p>
              {BRAND.name} is intended solely for personal, non-commercial media organization and entertainment. Users agree not to abuse, overload, scrap, or attempt unauthorized access to any infrastructure supporting the application.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>4. Termination & Account Deletion</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate system integrity or engage in malicious automation. You may terminate your account and erase all associated data at any time via Settings.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
