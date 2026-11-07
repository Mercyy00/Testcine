import { useEffect } from "react";
import { useSettings } from "../lib/store";
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

  return <Component {...pageProps} />;
}
