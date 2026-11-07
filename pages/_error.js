import Link from "next/link";
import Layout from "../components/Layout";

function Error({ statusCode, hasGetInitialPropsRun, err }) {
  if (!hasGetInitialPropsRun && err) {
    console.error("Unhandled error captured in _error.js:", err);
  }

  return (
    <Layout title={statusCode ? `Error ${statusCode}` : "Error"}>
      <div
        className="pageInner"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 16,
          paddingBlock: "80px",
          minHeight: "60vh",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            color: "var(--primary, #01b4e4)",
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          {statusCode ? `Error ${statusCode}` : "Client error"}
        </p>
        <h1 className="pageTitle" style={{ margin: 0, fontSize: "32px", fontWeight: 800 }}>
          Something went wrong
        </h1>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: "16px",
            color: "var(--text-dim)",
            maxWidth: "54ch",
            lineHeight: 1.6,
          }}
        >
          An unexpected error occurred while loading this page. You can return to the home page or try refreshing.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/" className="btnHero" style={{ textDecoration: "none" }}>
            Return home
          </Link>
          <button
            type="button"
            className="chip"
            onClick={() => window.location.reload()}
            style={{ padding: "10px 18px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            Reload page
          </button>
        </div>
      </div>
    </Layout>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode, hasGetInitialPropsRun: true, err };
};

export default Error;
