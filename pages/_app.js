import { useEffect } from "react";
import Head from "next/head";
import { SessionProvider } from "next-auth/react";
import SyncManager from "../components/SyncManager";
import { Bebas_Neue } from "next/font/google";
import { useSettings } from "../lib/store";
import "../styles/globals.css";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
  display: "swap",
});

export default function App({ Component, pageProps }) {
  const [settings] = useSettings();

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
      </Head>
      <SessionProvider session={pageProps.session} refetchOnWindowFocus={false}>
        <SyncManager />
        <Component {...pageProps} />
      </SessionProvider>
    </div>
  );
}
