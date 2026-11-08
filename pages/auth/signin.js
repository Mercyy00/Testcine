import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import Layout from "../../components/Layout";
import styles from "../../styles/Auth.module.css";

const ERRORS = {
  CredentialsSignin: "Invalid email or password",
  OAuthAccountNotLinked: "This email is already linked to another sign-in method",
  OAuthSignin: "Could not start social sign-in",
  OAuthCallback: "Social sign-in failed. Try again",
  Default: "Something went wrong. Try again",
};

function safeCallback(v) {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export default function SignIn() {
  const router = useRouter();
  const callbackUrl = safeCallback(router.query.callbackUrl);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(router.query.error ? ERRORS[router.query.error] || ERRORS.Default : "");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.ok) router.push(callbackUrl);
    else setError(ERRORS[res?.error] || ERRORS.Default);
  }

  return (
    <Layout title="Sign in" flush>
      <div className={styles.wrap}>
        <form className={styles.card} onSubmit={submit}>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.sub}>Sync your history and lists across devices.</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <label className={styles.field}>Email
            <input className={styles.input} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className={styles.field}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Password</span>
              <Link href="/auth/forgot" style={{ fontSize: "12px", color: "var(--text-soft)", textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>
            <input className={styles.input} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className={styles.btn} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "1" && <button type="button" className={styles.oauth} onClick={() => signIn("google", { callbackUrl })}>Continue with Google</button>}
          {process.env.NEXT_PUBLIC_GITHUB_ENABLED === "1" && <button type="button" className={styles.oauth} onClick={() => signIn("github", { callbackUrl })}>Continue with GitHub</button>}
          <p className={styles.alt}>New here? <Link href="/auth/signup">Create an account</Link></p>
        </form>
      </div>
    </Layout>
  );
}
