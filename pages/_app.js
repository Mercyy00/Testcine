import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import SyncManager from "../components/SyncManager";
import { useSettings } from "../lib/store";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "@fontsource/figtree/800.css";
import "@fontsource/figtree/900.css";
import "@fontsource/bebas-neue/400.css";
import "../styles/globals.css";

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
    <div className="appRoot">
      <SessionProvider session={pageProps.session} refetchOnWindowFocus={false}>
        <SyncManager />
        <Component {...pageProps} />
      </SessionProvider>
    </div>
  );
}
