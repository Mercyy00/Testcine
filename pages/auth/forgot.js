import { useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import styles from "../../styles/Auth.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) {
        setError(data.error || "Failed to submit request.");
      } else {
        setMessage(data.message || "Reset link sent! Please check your email.");
      }
    } catch {
      setBusy(false);
      setError("An unexpected error occurred. Please try again.");
    }
  }

  return (
    <Layout title="Forgot Password · Vivarium" flush>
      <div className={styles.wrap}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.sub}>Enter your account email to receive a password reset link.</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {message && <p style={{ color: "#4ade80", fontSize: "14px", margin: "0 0 12px" }}>{message}</p>}
          <label className={styles.field}>
            Email address
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className={styles.btn} disabled={busy || Boolean(message)}>
            {busy ? "Sending…" : "Send Reset Link"}
          </button>
          <p className={styles.alt}>
            Remembered your password? <Link href="/auth/signin">Sign in</Link>
          </p>
        </form>
      </div>
    </Layout>
  );
}
