import Layout from "../components/Layout";
import { BRAND } from "../lib/constants";

export default function PrivacyPage() {
  return (
    <Layout title="Privacy Policy" description={`Privacy Policy for ${BRAND.name}: Zero telemetry, local-first data, and complete user ownership.`}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px var(--page-pad) 96px" }}>
        <h1 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.5 }}>
          Privacy Policy
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, margin: "0 0 36px" }}>
          Effective Date: January 1, 2026
        </p>

        <div style={{ display: "grid", gap: 32, fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>
          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>1. Zero Telemetry & Tracking</h2>
            <p>
              {BRAND.name} operates under a strict zero-telemetry policy. We do not track your browsing habits, sell your data to advertisers, or inject third-party analytics scripts into our application. Your activity is your own.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>2. Local-First Storage</h2>
            <p>
              When using {BRAND.name} as a guest, your watch progress, history, and preferences are stored exclusively on your device using browser LocalStorage. No account or server transmission is required to enjoy the full platform.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>3. Account & Cross-Device Sync</h2>
            <p>
              If you choose to register an account, your watch history, watchlist, custom lists, and settings are securely encrypted and synchronized to allow seamless playback across your devices. You can export your data or delete your account permanently at any time from the Settings page.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>4. Third-Party Services & Metadata</h2>
            <p>
              Movie, series, and anime metadata, posters, and backdrops are retrieved via the TMDB API. This product uses the TMDB API but is not endorsed or certified by TMDB. When watching trailers, embedded video players connect directly to YouTube servers subject to Google's privacy policies.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>5. Right to Erasure (GDPR & CCPA)</h2>
            <p>
              Under global data protection regulations, you retain full rights to your information. You may click "Export Data" in Settings to download your entire database record in standard JSON format, or click "Delete Account" to purge all records permanently from our servers.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
