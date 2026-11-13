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
import "../styles/glass.css";

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

      const themeMode = settings.themeMode || (theme === "performance" ? "performance" : "default");
      document.documentElement.dataset.themeMode = themeMode;

      const intensity =
        settings.showBackground !== false && themeMode !== "performance"
          ? (settings.bgIntensity ?? 85) / 100
          : 0;
      document.documentElement.style.setProperty("--mood-bright", String(intensity));
    }
  }, [settings.theme, settings.themeMode, settings.bgIntensity, settings.showBackground]);

  // Buttery-smooth inertial momentum scrolling (Lenis)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Honor accessibility preferences or user toggle
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || settings.smoothScroll === false) {
      if (window.__lenis) {
        window.__lenis.destroy();
        delete window.__lenis;
      }
      return;
    }

    let lenis = null;
    let rafId = null;

    import("lenis").then(({ default: Lenis }) => {
      lenis = new Lenis({
        duration: 1.35, // Luxurious, buttery smooth inertia duration
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration curve
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1.15, // Glides a little bit further per wheel tick
        touchMultiplier: 1.5,
        infinite: false,
      });

      window.__lenis = lenis;

      function raf(time) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);
    });

    const handleRouteChange = () => {
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { immediate: true });
      }
    };
    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
      if (rafId) cancelAnimationFrame(rafId);
      if (lenis) {
        lenis.destroy();
        delete window.__lenis;
      }
    };
  }, [settings.smoothScroll, router]);

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
