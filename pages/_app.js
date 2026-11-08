import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import SyncManager from "../components/SyncManager";
import { Figtree, Bebas_Neue } from "next/font/google";
import { useSettings } from "../lib/store";
import "../styles/globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-figtree",
  display: "swap",
});

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
    <div className={`${figtree.variable} ${bebasNeue.variable} appRoot`}>
      <SessionProvider session={pageProps.session} refetchOnWindowFocus={false}>
        <SyncManager />
        <Component {...pageProps} />
      </SessionProvider>
    </div>
  );
}
