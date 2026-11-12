import { useState, useEffect, useRef, useMemo } from "react";
import { DEFAULT_AVATAR } from "../lib/avatars";
import Head from "next/head";
import { useSession, signOut } from "next-auth/react";
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
import { BRAND } from "../lib/constants";
import { useToast } from "../lib/useToast";
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
import { AVATAR_CATEGORIES } from "../lib/avatars";
import styles from "../styles/Settings.module.css";

// 10 Themes matching Image 4
const THEMES = [
  { id: "dark", name: "Dark", styleClass: "" },
  { id: "performance", name: "Performance", styleClass: styles.themeOnyx },
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
  const { status: authStatus } = useSession();
  const exportData = () => {
    if (authStatus === "authenticated") { window.location.href = "/api/user/export"; return; }
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("viv:") && k !== "viv:settings") { try { out[k] = JSON.parse(localStorage.getItem(k)); } catch {} }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
    a.download = "divine-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const deleteAccount = () => {
    setDialogMode("delete-account");
    setDialogInput("");
    setDialogCurrentPassword("");
    setDeleteConfirmText("");
  };
  const [activeTab, setActiveTab] = useState("account");
  const [device, setDevice] = useState({ label: "This browser", sub: "Active now" });
  useEffect(() => {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
    const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Win/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "device";
    let tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {}
    setDevice({ label: `${browser} on ${os}`, sub: `${tz || "Local"} · Active now` });
  }, []);
  const [searchQuery, setSearchQuery] = useState("");

  // Current active profile
  const activeProfile = useMemo(() => {
    return (
      (profiles || []).find((p) => p.id === activeProfileId) ||
      profiles?.[0] || {
        id: "guest",
        name: "Guest",
        avatar: DEFAULT_AVATAR,
      }
    );
  }, [profiles, activeProfileId]);

  // Form states
  const [nameVal, setNameVal] = useState(activeProfile?.name || settings.name || "Guest");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarCategory, setAvatarCategory] = useState("All");

  const visibleAvatars =
    avatarCategory === "All"
      ? PROFILE_AVATARS
      : PROFILE_AVATARS.filter((a) => a.category === avatarCategory);

  // Dropdown states
  const [openAudioMenu, setOpenAudioMenu] = useState(false);
  const [openRegionMenu, setOpenRegionMenu] = useState(false);

  // Modals / Dialogs
  const [dialogMode, setDialogMode] = useState(null); // "email" | "password" | "clear-history" | "clear-watchlist" | "reset-all" | "signout-all" | "delete-account"
  const [dialogInput, setDialogInput] = useState("");
  const [dialogCurrentPassword, setDialogCurrentPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Toast with auto-cleanup
  const [toast, showToast] = useToast(2500);

  // Sync profile name
  useEffect(() => {
    setNameVal(activeProfile?.name || settings.name || "Guest");
  }, [activeProfile, settings.name]);

  // Apply theme to document element
  useEffect(() => {
    if (typeof document !== "undefined") {
      const t = settings.theme || "dark";
      document.documentElement.dataset.theme = t;
      const themeMode = settings.themeMode || (t === "performance" ? "performance" : "default");
      document.documentElement.dataset.themeMode = themeMode;
      const intensity = themeMode === "performance" ? 0 : (settings.bgIntensity ?? 85) / 100;
      document.documentElement.style.setProperty("--mood-bright", String(intensity));
    }
  }, [settings.theme, settings.themeMode, settings.bgIntensity]);

  // Function hoisted before useEffect to prevent TDZ error
  function handleClose() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

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

  // Avatar select
  const handleSelectAvatar = (av) => {
    updateProfile(setProfiles, activeProfile.id, {
      avatar: av.url,
    });
    setSettings((s) => ({
      ...s,
      avatar: av.url,
    }));
    showToast(`Avatar changed to ${av.name}`);
    setShowAvatarPicker(false);
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
  const handleConfirmDialog = async () => {
    if (dialogMode === "email") {
      const trimmed = dialogInput.trim();
      if (!trimmed || !trimmed.includes("@")) {
        showToast("Please enter a valid email address");
        return;
      }
      try {
        const r = await fetch("/api/user/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        if (r.ok) {
          setSettings((s) => ({ ...s, email: trimmed }));
          showToast("Email updated successfully");
        } else {
          const d = await r.json().catch(() => ({}));
          showToast(d.error || "Failed to update email");
          return;
        }
      } catch {
        showToast("Network error updating email");
        return;
      }
    } else if (dialogMode === "password") {
      if (dialogInput.trim().length < 6) {
        showToast("Password must be at least 6 characters");
        return;
      }
      try {
        const r = await fetch("/api/user/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: dialogCurrentPassword,
            newPassword: dialogInput.trim(),
          }),
        });
        if (r.ok) {
          setSettings((s) => ({ ...s, passwordSet: true }));
          showToast("Password updated successfully");
        } else {
          const d = await r.json().catch(() => ({}));
          showToast(d.error || "Failed to update password");
          return;
        }
      } catch {
        showToast("Network error updating password");
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
      try {
        await fetch("/api/user/signout-all", { method: "POST" });
      } catch {}
      Object.keys(localStorage)
        .filter((k) => k.startsWith("viv:"))
        .forEach((k) => localStorage.removeItem(k));
      showToast("Signed out of all devices");
      signOut({ callbackUrl: "/" });
      return;
    } else if (dialogMode === "delete-account") {
      if (deleteConfirmText !== "DELETE") {
        showToast('Please type "DELETE" to confirm');
        return;
      }
      try {
        const r = await fetch("/api/user/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: dialogCurrentPassword }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          showToast(d.error || "Could not delete account");
          return;
        }
        Object.keys(localStorage)
          .filter((k) => k.startsWith("viv:"))
          .forEach((k) => localStorage.removeItem(k));
        signOut({ callbackUrl: "/" });
        return;
      } catch {
        showToast("Network error deleting account");
        return;
      }
    }
    setDialogMode(null);
    setDialogInput("");
    setDialogCurrentPassword("");
    setDeleteConfirmText("");
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

  // Storage calculation for About tab - client only to avoid SSR hydration mismatch
  const [storageKb, setStorageKb] = useState("0 KB");
  useEffect(() => {
    try {
      let total = 0;
      for (const k in window.localStorage) {
        if (Object.prototype.hasOwnProperty.call(window.localStorage, k)) {
          total += (window.localStorage[k] || "").length * 2;
        }
      }
      setStorageKb(`${Math.max(12, Math.round(total / 1024))} KB`);
    } catch {
      setStorageKb("14 KB");
    }
  }, []);

  return (
    <>
      <Head>
        <title>Settings · {BRAND.name}</title>
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
                aria-label="Search settings"
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
          <div key={activeTab} className={styles.contentArea}>
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
                      onClick={() => setShowAvatarPicker((v) => !v)}
                      title="Click to choose avatar"
                      aria-label="Choose profile avatar"
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
                        aria-label="Profile display name"
                        required
                      />
                    </div>
                    <button type="submit" className={styles.saveBtn}>
                      Save
                    </button>
                  </form>

                  {showAvatarPicker && (
                    <div className={styles.avatarPickerWrap}>
                      <div className={styles.avatarCategoryTabs}>
                        {AVATAR_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`${styles.avatarCategoryTab} ${
                              avatarCategory === cat ? styles.avatarCategoryTabActive : ""
                            }`}
                            onClick={() => setAvatarCategory(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className={styles.avatarGrid}>
                        {visibleAvatars.map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            className={`${styles.avatarChoice} ${
                              activeProfile.avatar === av.url ? styles.avatarChoiceActive : ""
                            }`}
                            onClick={() => handleSelectAvatar(av)}
                            title={`${av.name} (${av.subtitle})`}
                            aria-label={`${av.name} (${av.subtitle})`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={av.url} alt={av.name} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchesSearch("Public profile") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Public profile</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.publicProfile)}
                        aria-label="Public profile"
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
                        aria-label="Show watch history"
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
                          {settings.email || "guest@divine.internal"}
                        </span>
                        <button
                          type="button"
                          className={styles.pillActionBtn}
                          onClick={() => {
                            setDialogMode("email");
                            setDialogInput(settings.email || "guest@divine.internal");
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
                        <span className={styles.settingLabel}>{device.label}</span>
                        <span className={styles.deviceBadge}>This device</span>
                      </div>
                      <span className={styles.settingSub}>{device.sub}</span>
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
                          <span>{settings.preferredAudio || "Original"}</span>
                          <ChevronDown size={14} />
                        </button>

                        {openAudioMenu && (
                          <div className={styles.dropdownMenu}>
                            {LANGUAGES.map((lang) => (
                              <button
                                key={lang}
                                type="button"
                                className={`${styles.dropdownItem} ${
                                  (settings.preferredAudio || "Original") === lang
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
                                {(settings.preferredAudio || "Original") === lang && (
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
                        aria-label="Pause screen"
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
                      <span className={styles.settingLabel}>
                        Skip intros
                        <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "var(--text-dim)", marginLeft: 6 }}>Preview</span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.skipIntros)}
                        aria-label="Skip intros"
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
                      <span className={styles.settingLabel}>
                        Skip credits
                        <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "var(--text-dim)", marginLeft: 6 }}>Preview</span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.skipCredits)}
                        aria-label="Skip credits"
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
                      <span className={styles.settingLabel}>
                        Skip filler
                        <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "var(--text-dim)", marginLeft: 6 }}>Preview</span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.skipFiller)}
                        aria-label="Skip filler"
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
                        aria-label="Resume playback"
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
                        aria-label="Remember last source"
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
                        aria-label="Data saver"
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
                  <h2 className={styles.sectionTitle} style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
                    Theme
                  </h2>
                  <div className={styles.themeModeGrid}>
                    {/* 1. Default (Liquid Glass) matching Vivarium reference */}
                    <button
                      type="button"
                      className={styles.themeModeCard}
                      onClick={() => {
                        setSettings((s) => ({ ...s, themeMode: "default" }));
                        showToast("Applied Default Theme");
                      }}
                      aria-label="Select Default Theme"
                    >
                      <div
                        className={`${styles.themeModePreview} ${
                          (settings.themeMode || "default") === "default" ? styles.themeModePreviewActive : ""
                        }`}
                        style={{
                          background: "radial-gradient(circle at 75% 40%, rgba(220, 80, 20, 0.45) 0%, rgba(10, 11, 16, 0.95) 70%)",
                        }}
                      >
                        {/* Mini floating capsule navbar */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "auto" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              background: "rgba(255, 255, 255, 0.14)",
                              backdropFilter: "blur(8px)",
                              borderRadius: 999,
                              padding: "2px 6px",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                            }}
                          >
                            <span style={{ fontSize: 7, fontWeight: 700, color: "#fff", background: "rgba(255, 255, 255, 0.2)", borderRadius: 999, padding: "1px 5px" }}>Home</span>
                            <span style={{ fontSize: 7, color: "rgba(255, 255, 255, 0.7)" }}>Movies</span>
                            <span style={{ fontSize: 7, color: "rgba(255, 255, 255, 0.7)" }}>Series</span>
                            <span style={{ fontSize: 7, color: "rgba(255, 255, 255, 0.7)" }}>Anime</span>
                          </div>
                          <div
                            style={{
                              background: "rgba(255, 255, 255, 0.12)",
                              backdropFilter: "blur(8px)",
                              borderRadius: 999,
                              padding: "2px 14px",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              fontSize: 7,
                              color: "rgba(255, 255, 255, 0.5)",
                            }}
                          >
                            Search...
                          </div>
                          <div style={{ display: "flex", gap: 3 }}>
                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(255, 255, 255, 0.15)" }} />
                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(255, 255, 255, 0.15)" }} />
                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(255, 255, 255, 0.15)" }} />
                          </div>
                        </div>

                        {/* Hero preview content */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 14, paddingLeft: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: 1.5, fontFamily: "serif" }}>
                            THE ODYSSEY
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 7, color: "rgba(255, 255, 255, 0.8)" }}>
                            <span style={{ border: "1px solid #22c55e", borderRadius: "50%", width: 12, height: 12, display: "grid", placeItems: "center", fontSize: 6, fontWeight: 800 }}>8.0</span>
                            <span>• 2021 • 2h 53m •</span>
                            <span style={{ background: "#ea580c", padding: "0 3px", borderRadius: 2, fontSize: 6, color: "#fff" }}>18</span>
                            <span>• HD</span>
                          </div>
                          <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                            <span style={{ background: "#fff", color: "#000", fontWeight: 800, fontSize: 7, padding: "3px 8px", borderRadius: 3 }}>▶ Play</span>
                            <span style={{ background: "rgba(255, 255, 255, 0.15)", color: "#fff", fontWeight: 600, fontSize: 7, padding: "3px 8px", borderRadius: 3 }}>Details</span>
                          </div>
                        </div>

                        {/* Pager dots */}
                        <div style={{ display: "flex", gap: 3, justifyContent: "flex-end", marginTop: "auto", paddingRight: 4 }}>
                          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />
                          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff" }} />
                          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />
                        </div>
                      </div>
                      <span className={styles.themeModeLabel}>Default</span>
                    </button>

                    {/* 2. Performance (Solid & Fast) matching Vivarium reference */}
                    <button
                      type="button"
                      className={styles.themeModeCard}
                      onClick={() => {
                        setSettings((s) => ({ ...s, themeMode: "performance" }));
                        showToast("Applied Performance Theme");
                      }}
                      aria-label="Select Performance Theme"
                    >
                      <div
                        className={`${styles.themeModePreview} ${
                          settings.themeMode === "performance" ? styles.themeModePreviewActive : ""
                        }`}
                        style={{
                          background: "#08090d",
                        }}
                      >
                        {/* Flush top navbar */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 4 }}>
                          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                            <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", borderBottom: "1.5px solid #fff", paddingBottom: 1 }}>Home</span>
                            <span style={{ fontSize: 7, color: "rgba(255, 255, 255, 0.7)" }}>Movies</span>
                            <span style={{ fontSize: 7, color: "rgba(255, 255, 255, 0.7)" }}>Series</span>
                            <span style={{ fontSize: 7, color: "rgba(255, 255, 255, 0.7)" }}>Anime</span>
                            <span style={{ fontSize: 7, color: "rgba(255, 255, 255, 0.7)" }}>Browse ⌵</span>
                          </div>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.6)" }} />
                            <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.6)" }} />
                            <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.6)" }} />
                          </div>
                        </div>

                        {/* Hero preview content */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 10, paddingLeft: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: 1.5, fontFamily: "serif" }}>
                            THE ODYSSEY
                          </span>
                          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                            <span style={{ background: "#fff", color: "#000", fontWeight: 800, fontSize: 7, padding: "2px 7px", borderRadius: 3 }}>▶ Play</span>
                            <span style={{ background: "rgba(255, 255, 255, 0.15)", color: "#fff", fontWeight: 600, fontSize: 7, padding: "2px 7px", borderRadius: 3 }}>Details</span>
                          </div>
                        </div>

                        {/* Top 10 Today Row Preview */}
                        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 6.5, fontWeight: 700, color: "#fff" }}>Top 10 Today</span>
                          <div style={{ display: "flex", gap: 4 }}>
                            {[1, 2, 3, 4].map((num) => (
                              <div
                                key={num}
                                style={{
                                  flex: 1,
                                  height: 20,
                                  background: "rgba(255, 255, 255, 0.08)",
                                  borderRadius: 3,
                                  position: "relative",
                                  padding: 2,
                                }}
                              >
                                <span style={{ fontSize: 6, fontWeight: 800, color: "#fff" }}>{num}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className={styles.themeModeLabel}>Performance</span>
                    </button>
                  </div>

                  <h2 className={styles.sectionTitle}>Theme Preset</h2>

                  {/* Themes Grid */}
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
                            const newThemeMode = th.id === "performance" ? "performance" : settings.themeMode;
                            setSettings((s) => ({ ...s, theme: th.id, themeMode: newThemeMode }));
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
                        aria-label="Show background"
                        className={`${styles.toggleSwitch} ${
                          settings.showBackground !== false ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("showBackground")}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </div>
                  )}

                  {/* Smooth Inertial Scrolling */}
                  {matchesSearch("Smooth inertial scrolling") && (
                    <div className={styles.settingRow}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span className={styles.settingLabel}>Smooth inertial scrolling</span>
                        <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.45)" }}>
                          Glides with buttery natural momentum and physics-based inertia
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.smoothScroll !== false}
                        aria-label="Smooth inertial scrolling"
                        className={`${styles.toggleSwitch} ${
                          settings.smoothScroll !== false ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() => toggleSetting("smoothScroll")}
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
                          aria-label="Background intensity"
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

                  {/* Ambient lighting */}
                  {matchesSearch("Ambient lighting") && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Ambient lighting</span>
                      <div className={styles.segmentedWrap}>
                        {[
                          { id: "art", label: "Artwork" },
                          { id: "live", label: "Live Sync" },
                          { id: "off", label: "Off" },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            className={`${styles.segmentBtn} ${
                              (settings.ambientLight || "art") === mode.id
                                ? styles.segmentBtnActive
                                : ""
                            }`}
                            onClick={() => {
                              setSettings((s) => ({ ...s, ambientLight: mode.id }));
                              showToast(`Ambient lighting set to ${mode.label}`);
                            }}
                          >
                            {mode.label}
                          </button>
                        ))}
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
                        aria-label="Autoplay previews"
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
                        aria-label="Play banner trailers on hover"
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
                        aria-label="Adult content"
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
                        aria-label="Hide watched"
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

                  <button type="button" className={styles.actionRowBtn} onClick={exportData}>
                    <span>Export my data (JSON)</span>
                  </button>
                  {authStatus === "authenticated" && (
                    <button type="button" className={`${styles.actionRowBtn} ${styles.dangerAction}`} onClick={deleteAccount}>
                      <span>Delete account</span>
                      <Trash2 size={16} />
                    </button>
                  )}
                </section>
              </>
            )}

            {/* ---------------- TAB 6: ABOUT ---------------- */}
            {activeTab === "about" && (
              <>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>About {BRAND.name}</h2>

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

                  {BRAND.discord && (
                    <div className={styles.settingRow}>
                      <span className={styles.settingLabel}>Discord</span>
                      <a
                        href={BRAND.discord}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}
                      >
                        <span>Join Discord</span>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}

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
                {dialogMode === "delete-account" && "Delete Account Permanently"}
              </h3>

              {dialogMode === "email" && (
                <input
                  type="email"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                  placeholder="Enter new email address"
                  aria-label="Email address"
                  className={styles.miniDialogInput}
                  autoFocus
                />
              )}

              {dialogMode === "password" && (
                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    type="password"
                    value={dialogCurrentPassword}
                    onChange={(e) => setDialogCurrentPassword(e.target.value)}
                    placeholder="Current password (leave blank if not set)"
                    aria-label="Current password"
                    className={styles.miniDialogInput}
                  />
                  <input
                    type="password"
                    value={dialogInput}
                    onChange={(e) => setDialogInput(e.target.value)}
                    placeholder="New password (min. 6 chars)"
                    aria-label="New password"
                    className={styles.miniDialogInput}
                    autoFocus
                  />
                </div>
              )}

              {dialogMode === "delete-account" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <p style={{ color: "rgba(255,100,100,0.9)", fontSize: 13, margin: 0, lineHeight: 1.4 }}>
                    Warning: This action is permanent and cannot be undone. All your history, watchlist, lists, and ratings will be erased.
                  </p>
                  <input
                    type="password"
                    value={dialogCurrentPassword}
                    onChange={(e) => setDialogCurrentPassword(e.target.value)}
                    placeholder="Your password (leave blank for social sign-in)"
                    aria-label="Password"
                    className={styles.miniDialogInput}
                  />
                  <div>
                    <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 }}>
                      Type <strong>DELETE</strong> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      aria-label="Type DELETE to confirm"
                      className={styles.miniDialogInput}
                      autoFocus
                    />
                  </div>
                </div>
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
                    dialogMode.includes("clear") || dialogMode.includes("reset") || dialogMode.includes("signout") || dialogMode === "delete-account"
                      ? styles.dialogConfirmDanger
                      : ""
                  }`}
                  onClick={handleConfirmDialog}
                >
                  {dialogMode === "delete-account" ? "Permanently Delete" : "Confirm"}
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
