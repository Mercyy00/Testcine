import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import Layout from "../../components/Layout";
import styles from "../../styles/Auth.module.css";

export default function SignUp() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) return setError("Passwords do not match");
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Could not create account");
      const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      router.push(res?.ok ? "/" : "/auth/signin");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Create account" flush>
      <div className={styles.wrap}>
        <form className={styles.card} onSubmit={submit}>
          <h1 className={styles.title}>Create account</h1>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <label className={styles.field}>Username
            <input className={styles.input} required minLength={3} maxLength={20} autoComplete="username" value={form.username} onChange={set("username")} />
          </label>
          <label className={styles.field}>Email
            <input className={styles.input} type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
          </label>
          <label className={styles.field}>Password
            <input className={styles.input} type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
          </label>
          <label className={styles.field}>Confirm password
            <input className={styles.input} type="password" required autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
          </label>
          <button className={styles.btn} disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
          <p className={styles.alt}>Already have an account? <Link href="/auth/signin">Sign in</Link></p>
        </form>
      </div>
    </Layout>
  );
}
