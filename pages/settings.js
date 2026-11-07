import { useState, useEffect, useRef, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  UserRound,
  Link2,
  Play,
  Sparkles,
  LayoutGrid,
  Info,
  Search,
  X,
  ChevronDown,
  Trash2,
  RotateCcw,
  Check,
  Laptop,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  useSettings,
  useProfiles,
  useActiveProfileId,
  useHistory,
  useList,
  updateProfile,
  PROFILE_AVATARS,
  DEFAULT_SETTINGS,
} from "../lib/store";
import styles from "../styles/Settings.module.css";

// 10 Themes matching Image 4
const THEMES = [
  { id: "dark", name: "Dark", styleClass: "" },
  { id: "onyx", name: "Onyx", styleClass: styles.themeOnyx },
  { id: "ash", name: "Ash", styleClass: styles.themeAsh },
  { id: "midnight", name: "Midnight", styleClass: styles.themeMidnight },
  { id: "mood", name: "Mood", styleClass: styles.themeMood },
  { id: "galaxy", name: "Galaxy", styleClass: styles.themeGalaxy },
  { id: "topography", name: "Topography", styleClass: styles.themeTopography },
  { id: "snow", name: "Snow", styleClass: styles.themeSnow },
  { id: "silk", name: "Silk", styleClass: styles.themeSilk },
  { id: "light-rays", name: "Light rays", styleClass: styles.themeLightRays },
];

const QUALITIES = ["Auto", "4K", "1080p", "720p", "480p"];
const SKIPS = ["5s", "10s", "15s", "30s"];

const LANGUAGES = [
  "Hindi",
  "English",
  "Japanese",
  "Spanish",
  "French",
  "German",
  "Korean",
  "Italian",
  "Portuguese",
  "Russian",
];

const REGIONS = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "Brazil",
  "Netherlands",
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useSettings();
  const [profiles, setProfiles] = useProfiles();
  const [activeProfileId] = useActiveProfileId();
  const [, setHistory] = useHistory();
  const [, setWatchlist] = useList();

  // Active Tab: "account" | "integrations" | "player" | "appearance" | "content" | "about"
  const [activeTab, setActiveTab] = useState("account");
  const [searchQuery, setSearchQuery] = useState("");

  // Current active profile
  const activeProfile = useMemo(() => {
    return (
      (profiles || []).find((p) => p.id === activeProfileId) ||
      profiles?.[0] || {
        id: "guest",
        name: "Guest",
        avatar: "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
      }
    );
  }, [profiles, activeProfileId]);

  // Form states
  const [nameVal, setNameVal] = useState(activeProfile?.name || settings.name || "Guest");

  // Dropdown states
  const [openAudioMenu, setOpenAudioMenu] = useState(false);
  const [openRegionMenu, setOpenRegionMenu] = useState(false);

  // Modals / Dialogs
  const [dialogMode, setDialogMode] = useState(null); // "email" | "password" | "clear-history" | "clear-watchlist" | "reset-all" | "signout-all"
  const [dialogInput, setDialogInput] = useState("");

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Sync profile name
  useEffect(() => {
    setNameVal(activeProfile?.name || settings.name || "Guest");
  }, [activeProfile, settings.name]);

  // Apply theme to document element
  useEffect(() => {
    if (typeof document !== "undefined") {
      const t = settings.theme || "dark";
      document.documentElement.dataset.theme = t;
      const intensity = (settings.bgIntensity ?? 85) / 100;
      document.documentElement.style.setProperty("--mood-bright", String(intensity));
    }
  }, [settings.theme, settings.bgIntensity]);

  // ESC key closes modal / navigates back
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (dialogMode) {
          setDialogMode(null);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dialogMode]);

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  // Helper to toggle boolean settings
  const toggleSetting = (key) => {
    setSettings((prev) => {
      const next = !Boolean(prev?.[key]);
      return { ...(prev || {}), [key]: next };
    });
  };

  // Profile Save
  const handleSaveProfile = (e) => {
    e?.preventDefault();
    const trimmed = (nameVal || "").trim();
    if (!trimmed) return;

    updateProfile(setProfiles, activeProfile.id, {
      name: trimmed,
    });

    setSettings((s) => ({
      ...s,
      name: trimmed,
    }));

    showToast("Profile saved");
  };

  // Avatar cycle / change
  const handleCycleAvatar = () => {
    const currentIndex = PROFILE_AVATARS.findIndex(
      (a) => a.url === activeProfile.avatar
    );
    const nextIndex = (currentIndex + 1) % PROFILE_AVATARS.length;
    const newAvatar = PROFILE_AVATARS[nextIndex].url;

    updateProfile(setProfiles, activeProfile.id, {
      avatar: newAvatar,
    });
    setSettings((s) => ({
      ...s,
      avatar: newAvatar,
    }));
    showToast(`Avatar changed to ${PROFILE_AVATARS[nextIndex].name}`);
  };

  // Dialog actions
  const handleConfirmDialog = () => {
    if (dialogMode === "email") {
      const trimmed = dialogInput.trim();
      if (trimmed) {
        setSettings((s) => ({ ...s, email: trimmed }));
        showToast("Email updated");
      }
    } else if (dialogMode === "password") {
      if (dialogInput.trim().length >= 6) {
        setSettings((s) => ({ ...s, passwordSet: true }));
        showToast("Password updated");
      } else {
        showToast("Password must be at least 6 characters");
        return;
      }
    } else if (dialogMode === "clear-history") {
      setHistory([]);
      showToast("Watch history cleared");
    } else if (dialogMode === "clear-watchlist") {
      setWatchlist([]);
      showToast("Watchlist cleared");
    } else if (dialogMode === "reset-all") {
      setSettings(DEFAULT_SETTINGS);
      showToast("All settings restored to defaults");
    } else if (dialogMode === "signout-all") {
      setSettings((s) => ({ ...s, signedIn: false, name: "Guest", email: "guest@vivarium.internal" }));
      showToast("Signed out of all devices");
    }
    setDialogMode(null);
    setDialogInput("");
  };

  // Search filter matching
  const matchesSearch = (text) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  // Auto-switch tab if user searches for something specific
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return;
    if (q.includes("email") || q.includes("pass") || q.includes("device") || q.includes("profile")) {
      setActiveTab("account");
    } else if (q.includes("simkl") || q.includes("trakt") || q.includes("anilist")) {
      setActiveTab("integrations");
    } else if (q.includes("quality") || q.includes("audio") || q.includes("skip") || q.includes("player") || q.includes("hindi")) {
      setActiveTab("player");
    } else if (q.includes("theme") || q.includes("color") || q.includes("background") || q.includes("dark") || q.includes("onyx")) {
      setActiveTab("appearance");
    } else if (q.includes("region") || q.includes("spoiler") || q.includes("history") || q.includes("clear") || q.includes("reset")) {
      setActiveTab("content");
    }
  }, [searchQuery]);

  // Storage calculation for About tab
  const storageKb = useMemo(() => {
    if (typeof window === "undefined") return "14 KB";
    try {
      let total = 0;
      for (const k in window.localStorage) {
        if (Object.prototype.hasOwnProperty.call(window.localStorage, k)) {
          total += (window.localStorage[k] || "").length * 2;
        }
      }
      return `${Math.max(12, Math.round(total / 1024))} KB`;
    } catch {
      return "14 KB";
    }
  }, []);

  return (
    <>
      <Head>
        <title>Settings · Vivarium</title>
      </Head>

      <main className={styles.pageWrap}>
        {/* Cinematic Backdrop */}
        <div className={styles.cinematicBackdrop} />

        {/* Modal Card */}
        <div className={styles.modalBox} role="dialog" aria-modal="true" aria-label="Settings">
          {/* Top-Right Close Button (✕) */}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close settings"
          >
            <X size={18} strokeWidth={2.4} />
          </button>

          {/* 1. Left Sidebar */}
          <aside className={styles.sidebar}>
            <h1 className={styles.modalTitle}>Settings</h1>

            {/* Search Input */}
            <div className={styles.searchWrap}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* Nav Menu Items */}
            <nav className={styles.navMenu} aria-label="Settings categories">
              <button
                type="button"
                className={`${styles.navItem} ${activeTab === "account" ? styles.navItemActive : ""}`}
                onClick={() => setActiveTab("account")}
              >
                <UserRound size={17} />
                <span>Account</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${activeTab === "integrations" ? styles.navItemActive : ""}`}
                onClick={() => setActiveTab("integrations")}
              >
                <Link2 size={17} />
                <span>Integrations</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${activeTab === "player" ? styles.navItemActive : ""}`}
                onClick={() => setActiveTab("player")}
              >
                <Play size={17} />
                <span>Player</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${activeTab === "appearance" ? styles.navItemActive : ""}`}
                onClick={() => setActiveTab("appearance")}
              >
                <Sparkles size={17} />
                <span>Appearance</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${activeTab === "content" ? styles.navItemActive : ""}`}
                onClick={() => setActiveTab("content")}
              >
                <LayoutGrid size={17} />
                <span>Content</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${activeTab === "about" ? styles.navItemActive : ""}`}
                onClick={() => setActiveTab("about")}
              >
                <Info size={17} />
                <span>About</span>
              </button>
            </nav>
          </aside>

          {/* 2. Right Content Area */}
          <div className={styles.contentArea}>
            {/* ---------------- TAB 1: ACCOUNT ---------------- */}
            {activeTab === "account" && (
              <>
                {/* Section: Profile */}
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Profile</h2>

                  <form onSubmit={handleSaveProfile} className={styles.profileInputRow}>
                    <button
                      type="button"
                      className={styles.profileAvatar}
                      onClick={handleCycleAvatar}
                      title="Click to change avatar"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeProfile.avatar || PROFILE_AVATARS[0].url}
                        alt={nameVal}
                      />
                    </button>
                    <div className={styles.nameInputWrap}>
                      <input
                        type="text"
                        value={nameVal}
                        onChange={(e) => setNameVal(e.target.value)}
                        className={styles.nameInput}
                        maxLength={28}
                        required
                      />
                    </div>
                    <button type="submit" className={styles.saveBtn}>
                      Save
                    </button>
                  </form>

                  {matchesSearch("Public profile") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Public profile</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.publicProfile)}
                        className={`${styles.toggleSwitch} ${
                          settings.publicProfile ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("publicProfile")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {matchesSearch("Show watch history") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Show watch history</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.showWatchHistory)}
                        className={`${styles.toggleSwitch} ${
                          settings.showWatchHistory ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("showWatchHistory")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}
                </section>

                {/* Section: Sign-in */}
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Sign-in</h2>

                  {matchesSearch("Email") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Email</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className={styles.settingSub}>
                          {settings.email || "guest@vivarium.internal"}
                        </span>
                        <button
                          type="button"
                          className={styles.pillActionBtn}
                          onClick={() => {
                            setDialogMode("email");
                            setDialogInput(settings.email || "guest@vivarium.internal");
                          }}
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}

                  {matchesSearch("Password") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Password</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className={styles.settingSub}>
                          {settings.passwordSet ? "••••••••" : "Not set"}
                        </span>
                        <button
                          type="button"
                          className={styles.pillActionBtn}
                          onClick={() => {
                            setDialogMode("password");
                            setDialogInput("");
                          }}
                        >
                          {settings.passwordSet ? "Change" : "Set"}
                        </button>
                      </div>
                    </div>
                  )}

                  {matchesSearch("Google") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Google</span>
                      <button
                        type="button"
                        className={`${styles.pillActionBtn} ${styles.unlinkBtn}`}
                        onClick={() => {
                          const next = !Boolean(settings.googleLinked);
                          setSettings((s) => ({ ...s, googleLinked: next }));
                          showToast(next ? "Google account linked" : "Google account unlinked");
                        }}
                      >
                        {settings.googleLinked !== false ? "Unlink" : "Link"}
                      </button>
                    </div>
                  )}
                </section>

                {/* Section: Devices */}
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Devices</h2>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLeft}>
                      <div>
                        <span className={styles.settingLabel}>Chrome on Windows</span>
                        <span className={styles.deviceBadge}>This device</span>
                      </div>
                      <span className={styles.settingSub}>IN · Active just now</span>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Sign out of all devices</span>
                    <button
                      type="button"
                      className={styles.deviceIconBtn}
                      onClick={() => setDialogMode("signout-all")}
                      aria-label="Sign out of all devices"
                    >
                      <Laptop size={18} />
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* ---------------- TAB 2: INTEGRATIONS ---------------- */}
            {activeTab === "integrations" && (
              <>
                {/* Section: Tracking */}
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Tracking</h2>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Simkl</span>
                    <button
                      type="button"
                      className={styles.pillActionBtn}
                      onClick={() => {
                        const next = !Boolean(settings.simklConnected);
                        setSettings((s) => ({ ...s, simklConnected: next }));
                        showToast(next ? "Connected to Simkl" : "Disconnected from Simkl");
                      }}
                    >
                      {settings.simklConnected ? "Disconnect" : "Connect"}
                    </button>
                  </div>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Trakt</span>
                    <span className={styles.unavailableLabel}>Unavailable</span>
                  </div>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>AniList</span>
                    <button
                      type="button"
                      className={styles.pillActionBtn}
                      onClick={() => {
                        const next = !Boolean(settings.anilistConnected);
                        setSettings((s) => ({ ...s, anilistConnected: next }));
                        showToast(next ? "Connected to AniList" : "Disconnected from AniList");
                      }}
                    >
                      {settings.anilistConnected ? "Disconnect" : "Connect"}
                    </button>
                  </div>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>MyAnimeList</span>
                    <span className={styles.unavailableLabel}>Unavailable</span>
                  </div>
                </section>
              </>
            )}

            {/* ---------------- TAB 3: PLAYER ---------------- */}
            {activeTab === "player" && (
              <>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Playback</h2>

                  {/* Preferred Quality */}
                  {matchesSearch("Preferred quality") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Preferred quality</span>
                      <div className={styles.segmentedWrap}>
                        {QUALITIES.map((q) => (
                          <button
                            key={q}
                            type="button"
                            className={`${styles.segmentBtn} ${
                              (settings.preferredQuality || "Auto") === q
                                ? styles.segmentBtnActive
                                : ""
                            }`}
                            onClick={() => {
                              setSettings((s) => ({ ...s, preferredQuality: q }));
                              showToast(`Quality set to ${q}`);
                            }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preferred Audio Language */}
                  {matchesSearch("Preferred audio language") && (
                    <div className={styles.settingRow} style={{ position: "relative" }}>
                      <span className={styles.settingLabel}>Preferred audio language</span>
                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          className={styles.dropdownSelectBtn}
                          onClick={() => setOpenAudioMenu((o) => !o)}
                        >
                          <span>{settings.preferredAudio || "Hindi"}</span>
                          <ChevronDown size={14} />
                        </button>

                        {openAudioMenu && (
                          <div className={styles.dropdownMenu}>
                            {LANGUAGES.map((lang) => (
                              <button
                                key={lang}
                                type="button"
                                className={`${styles.dropdownItem} ${
                                  (settings.preferredAudio || "Hindi") === lang
                                    ? styles.dropdownItemActive
                                    : ""
                                }`}
                                onClick={() => {
                                  setSettings((s) => ({ ...s, preferredAudio: lang }));
                                  setOpenAudioMenu(false);
                                  showToast(`Audio set to ${lang}`);
                                }}
                              >
                                <span>{lang}</span>
                                {(settings.preferredAudio || "Hindi") === lang && (
                                  <Check size={14} />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skip Forward/Back */}
                  {matchesSearch("Skip forward/back") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Skip forward/back</span>
                      <div className={styles.segmentedWrap}>
                        {SKIPS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`${styles.segmentBtn} ${
                              (settings.skipInterval || "10s") === s
                                ? styles.segmentBtnActive
                                : ""
                            }`}
                            onClick={() => {
                              setSettings((prev) => ({ ...prev, skipInterval: s }));
                              showToast(`Skip interval set to ${s}`);
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Autoplay next episode */}
                  {matchesSearch("Autoplay next episode") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Autoplay next episode</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.autoplayNext !== false}
                        className={`${styles.toggleSwitch} ${
                          settings.autoplayNext !== false ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("autoplayNext")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Pause screen */}
                  {matchesSearch("Pause screen") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Pause screen</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.pauseScreen !== false}
                        className={`${styles.toggleSwitch} ${
                          settings.pauseScreen !== false ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("pauseScreen")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Skip intros */}
                  {matchesSearch("Skip intros") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Skip intros</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.skipIntros)}
                        className={`${styles.toggleSwitch} ${
                          settings.skipIntros ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("skipIntros")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Skip credits */}
                  {matchesSearch("Skip credits") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Skip credits</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.skipCredits)}
                        className={`${styles.toggleSwitch} ${
                          settings.skipCredits ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("skipCredits")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Skip filler */}
                  {matchesSearch("Skip filler") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Skip filler</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.skipFiller)}
                        className={`${styles.toggleSwitch} ${
                          settings.skipFiller ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("skipFiller")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Resume playback */}
                  {matchesSearch("Resume playback") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Resume playback</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.resumePlayback !== false}
                        className={`${styles.toggleSwitch} ${
                          settings.resumePlayback !== false ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("resumePlayback")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Remember last source */}
                  {matchesSearch("Remember last source") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Remember last source</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.rememberLastSource)}
                        className={`${styles.toggleSwitch} ${
                          settings.rememberLastSource ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("rememberLastSource")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Data saver */}
                  {matchesSearch("Data saver") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Data saver</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.dataSaver)}
                        className={`${styles.toggleSwitch} ${
                          settings.dataSaver ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("dataSaver")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ---------------- TAB 4: APPEARANCE ---------------- */}
            {activeTab === "appearance" && (
              <>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Theme</h2>

                  {/* 10 Themes Grid (5 cols x 2 rows) */}
                  <div className={styles.themeGrid}>
                    {THEMES.map((th) => {
                      const isActive = (settings.theme || "dark") === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          className={`${styles.themeCard} ${
                            isActive ? styles.themeCardActive : ""
                          }`}
                          onClick={() => {
                            setSettings((s) => ({ ...s, theme: th.id }));
                            showToast(`Applied ${th.name} theme`);
                          }}
                        >
                          <div className={`${styles.themePreview} ${th.styleClass}`}>
                            <div className={styles.mockHeader}>
                              <div className={styles.mockDot} />
                              <div className={styles.mockDot} />
                              <div className={styles.mockDot} />
                            </div>
                            <div className={styles.mockBody}>
                              <div className={styles.mockTitleBar} />
                              <div className={styles.mockSubBar} />
                              <div className={styles.mockCardsRow}>
                                <div className={styles.mockCard} />
                                <div className={styles.mockCard} />
                                <div className={styles.mockCard} />
                              </div>
                            </div>
                          </div>
                          <span className={styles.themeName}>{th.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Show background */}
                  {matchesSearch("Show background") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Show background</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.showBackground !== false}
                        className={`${styles.toggleSwitch} ${
                          settings.showBackground !== false ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("showBackground")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Background intensity */}
                  {matchesSearch("Background intensity") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Background intensity</span>
                      <div className={styles.sliderWrap}>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={settings.bgIntensity ?? 85}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              bgIntensity: Number(e.target.value),
                            }))
                          }
                          className={styles.rangeInput}
                        />
                      </div>
                    </div>
                  )}
                </section>

                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Behavior</h2>

                  {/* Autoplay previews */}
                  {matchesSearch("Autoplay previews") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Autoplay previews</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.autoplayPreviews !== false}
                        className={`${styles.toggleSwitch} ${
                          settings.autoplayPreviews !== false ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("autoplayPreviews")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Play banner trailers on hover */}
                  {matchesSearch("Play banner trailers on hover") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Play banner trailers on hover</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.bannerTrailersOnHover)}
                        className={`${styles.toggleSwitch} ${
                          settings.bannerTrailersOnHover ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("bannerTrailersOnHover")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ---------------- TAB 5: CONTENT ---------------- */}
            {activeTab === "content" && (
              <>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Browsing</h2>

                  {/* Region */}
                  {matchesSearch("Region") && (
                    <div className={styles.settingRow} style={{ position: "relative" }}>
                      <span className={styles.settingLabel}>Region</span>
                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          className={styles.dropdownSelectBtn}
                          onClick={() => setOpenRegionMenu((o) => !o)}
                        >
                          <span>{settings.region || "United States"}</span>
                          <ChevronDown size={14} />
                        </button>

                        {openRegionMenu && (
                          <div className={styles.dropdownMenu}>
                            {REGIONS.map((reg) => (
                              <button
                                key={reg}
                                type="button"
                                className={`${styles.dropdownItem} ${
                                  (settings.region || "United States") === reg
                                    ? styles.dropdownItemActive
                                    : ""
                                }`}
                                onClick={() => {
                                  setSettings((s) => ({ ...s, region: reg }));
                                  setOpenRegionMenu(false);
                                  showToast(`Region set to ${reg}`);
                                }}
                              >
                                <span>{reg}</span>
                                {(settings.region || "United States") === reg && (
                                  <Check size={14} />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Adult content */}
                  {matchesSearch("Adult content") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Adult content</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.adultContent)}
                        className={`${styles.toggleSwitch} ${
                          settings.adultContent ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("adultContent")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Hide watched */}
                  {matchesSearch("Hide watched") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Hide watched</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.hideWatched)}
                        className={`${styles.toggleSwitch} ${
                          settings.hideWatched ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("hideWatched")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Hide spoilers */}
                  {matchesSearch("Hide spoilers") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Hide spoilers</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.hideSpoilers)}
                        className={`${styles.toggleSwitch} ${
                          settings.hideSpoilers ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("hideSpoilers")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}
                </section>

                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>History</h2>

                  {/* Incognito */}
                  {matchesSearch("Incognito") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Incognito</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.incognito)}
                        className={`${styles.toggleSwitch} ${
                          settings.incognito ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => {
                          const next = !Boolean(settings.incognito);
                          setSettings((s) => ({ ...s, incognito: next }));
                          showToast(next ? "Incognito enabled (history paused)" : "Incognito disabled");
                        }}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Clear history */}
                  {matchesSearch("Clear history") && (
                    <button
                      type="button"
                      className={styles.actionRowBtn}
                      onClick={() => setDialogMode("clear-history")}
                    >
                      <span>Clear history</span>
                      <Trash2 size={16} />
                    </button>
                  )}

                  {/* Clear watchlist */}
                  {matchesSearch("Clear watchlist") && (
                    <button
                      type="button"
                      className={styles.actionRowBtn}
                      onClick={() => setDialogMode("clear-watchlist")}
                    >
                      <span>Clear watchlist</span>
                      <Trash2 size={16} />
                    </button>
                  )}

                  {/* Reset all settings */}
                  {matchesSearch("Reset all settings") && (
                    <button
                      type="button"
                      className={`${styles.actionRowBtn} ${styles.dangerAction}`}
                      onClick={() => setDialogMode("reset-all")}
                    >
                      <span>Reset all settings</span>
                      <RotateCcw size={16} />
                    </button>
                  )}
                </section>
              </>
            )}

            {/* ---------------- TAB 6: ABOUT ---------------- */}
            {activeTab === "about" && (
              <>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>About Vivarium</h2>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Version</span>
                    <span className={styles.settingSub}>v2.4.0 (Build 2026.11)</span>
                  </div>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Framework</span>
                    <span className={styles.settingSub}>Next.js 16 (Turbopack)</span>
                  </div>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Data Provider</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={15} color="#4ade80" />
                      <span className={styles.settingSub} style={{ color: "#4ade80" }}>
                        The Movie Database (Connected)
                      </span>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Local storage used</span>
                    <span className={styles.settingSub}>{storageKb}</span>
                  </div>
                </section>

                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Legal & Community</h2>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Discord</span>
                    <a
                      href="https://discord.com"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}
                    >
                      <span>Join Discord</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Terms of Service</span>
                    <span className={styles.settingSub}>Updated November 2026</span>
                  </div>

                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Privacy Policy</span>
                    <span className={styles.settingSub}>Strict zero-telemetry</span>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {/* Mini Confirmation Dialog */}
        {dialogMode && (
          <div className={styles.miniDialogBackdrop} onClick={() => setDialogMode(null)}>
            <div className={styles.miniDialogBox} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.miniDialogTitle}>
                {dialogMode === "email" && "Change Email Address"}
                {dialogMode === "password" && "Set Account Password"}
                {dialogMode === "clear-history" && "Clear Watch History?"}
                {dialogMode === "clear-watchlist" && "Clear Watchlist?"}
                {dialogMode === "reset-all" && "Reset All Settings?"}
                {dialogMode === "signout-all" && "Sign Out of All Devices?"}
              </h3>

              {dialogMode === "email" && (
                <input
                  type="email"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                  placeholder="Enter email address"
                  className={styles.miniDialogInput}
                  autoFocus
                />
              )}

              {dialogMode === "password" && (
                <input
                  type="password"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)"
                  className={styles.miniDialogInput}
                  autoFocus
                />
              )}

              {dialogMode === "clear-history" && (
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "0 0 18px" }}>
                  This will remove all titles from your watch history and progress bars on this device.
                </p>
              )}

              {dialogMode === "clear-watchlist" && (
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "0 0 18px" }}>
                  This will remove all titles currently saved to your watchlist.
                </p>
              )}

              {dialogMode === "reset-all" && (
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "0 0 18px" }}>
                  This will reset all playback, theme, integration, and browsing preferences to default values.
                </p>
              )}

              {dialogMode === "signout-all" && (
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "0 0 18px" }}>
                  Are you sure you want to invalidate all active browser sessions and sign out?
                </p>
              )}

              <div className={styles.miniDialogActions}>
                <button
                  type="button"
                  className={styles.dialogCancel}
                  onClick={() => setDialogMode(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${styles.dialogConfirm} ${
                    dialogMode.includes("clear") || dialogMode.includes("reset") || dialogMode.includes("signout")
                      ? styles.dialogConfirmDanger
                      : ""
                  }`}
                  onClick={handleConfirmDialog}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && <div className={styles.toastNotice}>{toast}</div>}
      </main>
    </>
  );
}
