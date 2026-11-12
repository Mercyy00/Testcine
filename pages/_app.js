import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { SessionProvider } from "next-auth/react";
import SyncManager from "../components/SyncManager";
import LoadingScreen from "../components/LoadingScreen";
import { Bebas_Neue } from "next/font/google";
import { useSettings } from "../lib/store";
import "../lib/env";
import "../styles/globals.css";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
  display: "swap",
});

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [settings] = useSettings();
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    let timer = null;
    const handleStart = (url) => {
      if (url.split("?")[0] !== router.asPath.split("?")[0]) {
        timer = setTimeout(() => setRouteLoading(true), 120);
      }
    };
    const handleComplete = () => {
      if (timer) clearTimeout(timer);
      setRouteLoading(false);
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      if (timer) clearTimeout(timer);
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const theme = settings.theme || "dark";
      document.documentElement.dataset.theme = theme;

      const intensity =
        settings.showBackground !== false
          ? (settings.bgIntensity ?? 85) / 100
          : 0;
      document.documentElement.style.setProperty("--mood-bright", String(intensity));
    }
  }, [settings.theme, settings.bgIntensity, settings.showBackground]);

  return (
    <div className={`${bebasNeue.variable} appRoot`}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <SessionProvider session={pageProps.session} refetchOnWindowFocus={false}>
        <SyncManager />
        {routeLoading && <LoadingScreen fullScreen message="Loading DIVINE…" />}
        <div key={router.asPath.split("?")[0]} className="pageTransitionWrap">
          <Component {...pageProps} />
        </div>
      </SessionProvider>
    </div>
  );
}
