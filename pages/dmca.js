import Layout from "../components/Layout";
import { BRAND } from "../lib/constants";
import Link from "next/link";
import { ShieldAlert, Mail, FileText, CheckCircle2 } from "lucide-react";

export default function DmcaPage() {
  return (
    <Layout
      title="DMCA & Copyright Compliance"
      description={`DMCA and Copyright Notice for ${BRAND.name}: Zero video files hosted, third-party embed policies, and takedown procedures.`}
    >
      <div style={{ maxWidth: 840, margin: "0 auto", padding: "48px var(--page-pad) 96px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(255, 122, 48, 0.15)",
              border: "1px solid rgba(255, 122, 48, 0.3)",
              display: "grid",
              placeItems: "center",
              color: "var(--brand-amber, #ff7a30)",
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1
              style={{
                fontSize: "clamp(26px, 3.5vw, 38px)",
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.02em",
                color: "#ffffff",
              }}
            >
              DMCA & Copyright Policy
            </h1>
            <p style={{ color: "rgba(255, 255, 255, 0.55)", fontSize: 13, margin: "4px 0 0" }}>
              Digital Millennium Copyright Act Notice and Takedown Procedure
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 28, fontSize: 15, lineHeight: 1.7, color: "rgba(255, 255, 255, 0.85)", marginTop: 32 }}>
          <section
            style={{
              padding: "20px 24px",
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>
              1. Non-Hosting & Third-Party Embeds Statement
            </h2>
            <p style={{ margin: 0 }}>
              {BRAND.name} operates purely as an indexing and curation engine. <strong>We do not host, store, upload, or transmit any video files, media files, or copyright-protected content on our servers.</strong> All media playback is delivered via third-party embedded video players and publicly accessible web sources. {BRAND.name} does not control and is not affiliated with the third-party providers hosting these external streams.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>
              2. Notice & Takedown Procedure (17 U.S.C. § 512(c))
            </h2>
            <p>
              It is our policy to respond expeditiously to clear, valid notices of alleged copyright infringement in compliance with the Digital Millennium Copyright Act. If you are a copyright owner, or an agent authorized to act on behalf of one, and you believe that content accessible via our index infringes your copyright, please submit a written DMCA takedown request including the following information:
            </p>
            <ul style={{ paddingLeft: 20, display: "grid", gap: 8, margin: "14px 0" }}>
              <li>
                <strong>Identification of the copyrighted work</strong> claimed to have been infringed, or a representative list of such works.
              </li>
              <li>
                <strong>Identification of the specific material / URL</strong> on {BRAND.name} that contains the link or embed to be removed or disabled.
              </li>
              <li>
                <strong>Your contact information</strong>, including legal name, mailing address, telephone number, and email address.
              </li>
              <li>
                <strong>A statement of good faith belief</strong> that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
              </li>
              <li>
                <strong>A statement under penalty of perjury</strong> that the information in the notification is accurate and that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
              </li>
              <li>
                <strong>A physical or electronic signature</strong> of the copyright owner or authorized representative.
              </li>
            </ul>
          </section>

          <section
            style={{
              padding: "20px 24px",
              borderRadius: 14,
              background: "rgba(0, 229, 153, 0.06)",
              border: "1px solid rgba(0, 229, 153, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Mail size={18} style={{ color: "var(--primary, #00e599)" }} />
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0 }}>
                Designated Copyright Agent
              </h2>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 14 }}>
              Please send all copyright notices to our designated agent:
            </p>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--primary, #00e599)" }}>
              <strong>Email:</strong> legal@divine.su / dmca@divine.su
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "rgba(255, 255, 255, 0.6)" }}>
              Response turnaround SLA: Valid notices will be processed within <strong>24 business hours</strong>.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>
              3. Metadata Attribution
            </h2>
            <p style={{ margin: 0 }}>
              All show, movie, and anime metadata, titles, artwork, and descriptions are retrieved via the TMDB and AniList APIs. This product uses the TMDB API but is not endorsed or certified by TMDB. All trademarks, logos, and brand images belong to their respective copyright holders.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
