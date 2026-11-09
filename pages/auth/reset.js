import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import styles from "../../styles/Auth.module.css";

export default function ResetPassword() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const emailQuery = typeof router.query.email === "string" ? router.query.email : "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: emailQuery,
          password,
        }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess(true);
      }
    } catch {
      setBusy(false);
      setError("An unexpected error occurred. Please try again.");
    }
  }

  return (
    <Layout title="New Password · DIVINE" flush>
      <div className={styles.wrap}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.sub}>Choose a strong password with at least 8 characters.</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {success ? (
            <div>
              <p style={{ color: "#4ade80", fontSize: "14px", margin: "0 0 16px" }}>
                Your password has been reset successfully!
              </p>
              <Link href="/auth/signin" className={styles.btn} style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                Proceed to Sign In
              </Link>
            </div>
          ) : (
            <>
              {!token && (
                <p className={styles.error}>
                  Missing reset token. Please request a new link from the forgot password page.
                </p>
              )}
              <label className={styles.field}>
                New Password
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                Confirm New Password
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
              <button className={styles.btn} disabled={busy || !token}>
                {busy ? "Updating…" : "Update Password"}
              </button>
            </>
          )}
          <p className={styles.alt}>
            <Link href="/auth/signin">Return to sign in</Link>
          </p>
        </form>
      </div>
    </Layout>
  );
}
