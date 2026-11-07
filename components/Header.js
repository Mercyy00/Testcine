import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  House,
  Clapperboard,
  TvMinimal,
  Drama,
  Search,
  MessageSquare,
  Bell,
  LogOut,
  LogIn,
  UserRound,
  Bookmark,
  Clock,
  CalendarClock,
  Compass,
  Users,
  Settings,
  CheckCheck,
  X,
} from "lucide-react";
import SearchPalette from "./SearchPalette";
import Popover from "./Popover";
import { BRAND } from "../lib/constants";
import {
  useSettings,
  useProfiles,
  useActiveProfileId,
  useHistory,
  useList,
  useReadNotifications,
  useDismissedNotifications,
} from "../lib/store";
import { buildDynamicNotifications } from "../lib/notifications";
import styles from "./Header.module.css";

export const NAV = [
  { href: "/", label: "Home", Icon: House },
  { href: "/movies", label: "Movies", Icon: Clapperboard },
  { href: "/series", label: "Series", Icon: TvMinimal },
  { href: "/anime", label: "Anime", Icon: Drama },
];

const isActive = (path, href) => (href === "/" ? path === "/" : path.startsWith(href));

function Discord(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

export function Avatar({
  name = "Guest",
  image = "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
  size = 46,
}) {
  const [failed, setFailed] = useState(false);
  const letter = (name.trim()[0] || "G").toUpperCase();

  if (image && !failed) {
    return (
      <span className={styles.avatarWrap} style={{ width: size, height: size }} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={name}
          className={styles.avatarImg}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {letter}
    </span>
  );
}

export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fe388" />
          <stop offset="1" stopColor="#2f9d57" />
        </linearGradient>
      </defs>
      <path d="M32 6c14 6 22 18 20 32-1 10-9 18-20 20C21 56 13 48 12 38 10 24 18 12 32 6Z" fill="url(#leaf)" />
      <path d="M32 14v40M32 28l-9-7M32 38l-11-8M32 28l9-7M32 38l11-8" stroke="#0b3d1c" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function Header() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useSettings();
  const [profiles] = useProfiles();
  const [activeProfileId] = useActiveProfileId();
  const [history] = useHistory();
  const [watchlist] = useList();
  const [readIds, setReadIds] = useReadNotifications();
  const [dismissedIds, setDismissedIds] = useDismissedNotifications();

  // Notification Filter Tab: "all" | "unread" | "mentions"
  const [notifTab, setNotifTab] = useState("all");

  const signedIn = settings.signedIn !== false;

  const navRef = useRef(null);
  const linkRefs = useRef({});
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0, opacity: 0 });

  const activeProfile =
    (profiles || []).find((p) => p.id === activeProfileId) ||
    profiles?.[0] ||
    null;

  const name = activeProfile?.name || settings.name || "Guest";
  const avatarImage =
    activeProfile?.avatar ||
    settings.avatar ||
    "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg";
  const email = settings.email || "guest@vivarium.internal";

  // Real Dynamic Behavior Pattern Notifications
  const notificationsData = useMemo(() => {
    return buildDynamicNotifications({
      history,
      watchlist,
      readIds,
      dismissedIds,
    });
  }, [history, watchlist, readIds, dismissedIds]);

  const unread = notificationsData.unreadCount;

  const profileUsername = (activeProfile?.name || name).toLowerCase().replace(/\s+/g, "");
  const profileHref = `/u/${profileUsername || "guest"}`;

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    const allIds = notificationsData.all.map((n) => n.id);
    setReadIds((prev) => Array.from(new Set([...(prev || []), ...allIds])));
  };

  const handleDismissNotif = (e, notifId) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissedIds((prev) => [...(prev || []), notifId]);
  };

  const handleNotifClick = (item) => {
    setReadIds((prev) => Array.from(new Set([...(prev || []), item.id])));
    router.push(item.href);
  };

  // Filtered notifications based on active tab
  const displayToday = useMemo(() => {
    if (notifTab === "unread") return notificationsData.today.filter((n) => n.unread);
    if (notifTab === "mentions") return [];
    return notificationsData.today;
  }, [notifTab, notificationsData]);

  const displayThisWeek = useMemo(() => {
    if (notifTab === "unread") return notificationsData.thisWeek.filter((n) => n.unread);
    if (notifTab === "mentions") return [];
    return notificationsData.thisWeek;
  }, [notifTab, notificationsData]);

  const totalDisplayed = displayToday.length + displayThisWeek.length;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 15);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Determine active route key
  const activeHref = useMemo(() => {
    const path = router.pathname;
    if (path === "/" || path === "") return "/";
    for (const item of NAV) {
      if (item.href !== "/" && path.startsWith(item.href)) return item.href;
    }
    return null;
  }, [router.pathname]);

  // Measure and position the sliding indicator pill
  const updatePill = useCallback(() => {
    if (!navRef.current || !activeHref) {
      setPillStyle((p) => ({ ...p, opacity: 0 }));
      return;
    }
    const targetEl = linkRefs.current[activeHref];
    if (targetEl) {
      const navRect = navRef.current.getBoundingClientRect();
      const elRect = targetEl.getBoundingClientRect();
      setPillStyle({
        width: Math.round(elRect.width),
        left: Math.round(elRect.left - navRect.left),
        opacity: 1,
      });
    } else {
      setPillStyle((p) => ({ ...p, opacity: 0 }));
    }
  }, [activeHref]);

  useEffect(() => {
    updatePill();
    const id1 = requestAnimationFrame(updatePill);
    const id2 = setTimeout(updatePill, 100);
    const id3 = setTimeout(updatePill, 300);
    window.addEventListener("resize", updatePill);
    return () => {
      cancelAnimationFrame(id1);
      clearTimeout(id2);
      clearTimeout(id3);
      window.removeEventListener("resize", updatePill);
    };
  }, [updatePill]);

  const menu = [
    { href: "/profiles", label: "Switch profiles", Icon: UserRound },
    { href: "/lists", label: "Lists", Icon: Bookmark },
    { href: "/history", label: "History", Icon: Clock },
    { href: "/schedule", label: "Schedule", Icon: CalendarClock },
    { href: "/discover", label: "Discover", Icon: Compass },
    { href: "/settings", label: "Settings", Icon: Settings },
  ];

  return (
    <header className={`${styles.bar} ${scrolled ? styles.scrolled : ""}`}>
      {/* 1. Bar Start: Capsule with sliding link pill and links */}
      <div className={styles.barStart}>
        <nav className={styles.links} aria-label="Main" ref={navRef}>
          <span
            className={styles.linkPill}
            aria-hidden="true"
            style={{
              width: pillStyle.width ? `${pillStyle.width}px` : undefined,
              transform: `translateX(${pillStyle.left}px)`,
              opacity: pillStyle.opacity,
            }}
          />
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(router.pathname, href);
            return (
              <Link
                key={href}
                href={href}
                ref={(el) => (linkRefs.current[href] = el)}
                className={`${styles.link} ${active ? styles.linkOn : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={updatePill}
              >
                <span className={styles.linkIcon}>
                  <Icon size={22} strokeWidth={2} />
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 2. Center: Docked Search Palette */}
      <div className={styles.dock}>
        <SearchPalette />
      </div>

      {/* 3. Bar End: Round glass buttons (Watch party, Notifications bell, Profile avatar) */}
      <div className={styles.barEnd}>
        {/* Watch party / community chat */}
        <Link href="/watch-party" className={styles.round} aria-label="Community chat">
          <MessageSquare size={22} strokeWidth={2} />
        </Link>

        {/* Notifications */}
        <Popover
          label="Notifications"
          trigger={
            <span className={styles.round} aria-label="Notifications">
              <Bell size={22} strokeWidth={2} />
              {unread > 0 && <span className={styles.badge}>{unread}</span>}
            </span>
          }
          panelClass={styles.notes}
        >
          {/* Header Row: Title + CheckCheck mark all read icon button */}
          <div className={styles.notesHead}>
            <h2 className={styles.notesTitle}>Notifications</h2>
            <button
              type="button"
              className={styles.markAllBtn}
              onClick={handleMarkAllRead}
              title="Mark all as read"
              aria-label="Mark all as read"
            >
              <CheckCheck size={19} />
            </button>
          </div>

          {/* Filter Tabs: All | Unread | Mentions */}
          <div className={styles.notesTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={notifTab === "all"}
              className={`${styles.notesTabBtn} ${notifTab === "all" ? styles.notesTabBtnActive : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setNotifTab("all");
              }}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={notifTab === "unread"}
              className={`${styles.notesTabBtn} ${notifTab === "unread" ? styles.notesTabBtnActive : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setNotifTab("unread");
              }}
            >
              Unread
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={notifTab === "mentions"}
              className={`${styles.notesTabBtn} ${notifTab === "mentions" ? styles.notesTabBtnActive : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setNotifTab("mentions");
              }}
            >
              Mentions
            </button>
          </div>

          {/* Notifications List */}
          <div className={styles.notesList}>
            {totalDisplayed === 0 ? (
              <div className={styles.emptyNotifs}>
                {notifTab === "mentions"
                  ? "No mentions yet"
                  : notifTab === "unread"
                  ? "No unread notifications"
                  : "No notifications"}
              </div>
            ) : (
              <>
                {/* Group: Today */}
                {displayToday.length > 0 && (
                  <div>
                    <h3 className={styles.notesSectionHeader}>Today</h3>
                    {displayToday.map((item) => (
                      <div
                        key={item.id}
                        className={styles.notifItem}
                        onClick={() => handleNotifClick(item)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.poster}
                          alt={item.title}
                          className={styles.notifPoster}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div className={styles.notifBody}>
                          <span className={styles.notifTitle}>{item.title}</span>
                          <span className={styles.notifSub}>{item.subtitle}</span>
                        </div>
                        <button
                          type="button"
                          className={styles.dismissNotifBtn}
                          onClick={(e) => handleDismissNotif(e, item.id)}
                          aria-label={`Dismiss notification for ${item.title}`}
                          title="Dismiss"
                        >
                          <X size={13} strokeWidth={2.4} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Group: This week */}
                {displayThisWeek.length > 0 && (
                  <div>
                    <h3 className={styles.notesSectionHeader}>This week</h3>
                    {displayThisWeek.map((item) => (
                      <div
                        key={item.id}
                        className={styles.notifItem}
                        onClick={() => handleNotifClick(item)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.poster}
                          alt={item.title}
                          className={styles.notifPoster}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div className={styles.notifBody}>
                          <span className={styles.notifTitle}>{item.title}</span>
                          <span className={styles.notifSub}>{item.subtitle}</span>
                        </div>
                        <button
                          type="button"
                          className={styles.dismissNotifBtn}
                          onClick={(e) => handleDismissNotif(e, item.id)}
                          aria-label={`Dismiss notification for ${item.title}`}
                          title="Dismiss"
                        >
                          <X size={13} strokeWidth={2.4} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Popover>

        {/* Profile Avatar & Account Menu */}
        <Popover
          label="Account menu"
          trigger={
            <span className={styles.avatarBtn} aria-label="Account menu">
              <Avatar name={name} image={avatarImage} size={46} />
            </span>
          }
          panelClass={styles.menu}
        >
          <Link href={profileHref} className={styles.who} role="menuitem">
            <Avatar name={name} image={avatarImage} size={40} />
            <div className={styles.whoText}>
              <b>{name}</b>
              <small>{email}</small>
            </div>
          </Link>
          <button
            type="button"
            role="menuitem"
            className={`${styles.item} ${styles.danger}`}
            onClick={() =>
              setSettings((s) => ({
                ...s,
                signedIn: !signedIn,
                ...(signedIn ? { name: "Guest", email: "guest@vivarium.internal" } : {}),
              }))
            }
          >
            {signedIn ? <LogOut size={18} /> : <LogIn size={18} />}
            {signedIn ? "Log out" : "Sign in"}
          </button>
          <hr className={styles.rule} />
          {menu.map(({ href, label, Icon }) => (
            <Link key={href} href={href} role="menuitem" className={styles.item}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
          {BRAND.discord && (
            <a href={BRAND.discord} target="_blank" rel="noreferrer" role="menuitem" className={styles.item}>
              <Discord />
              Discord
            </a>
          )}
        </Popover>
      </div>
    </header>
  );
}

export function MobileNav() {
  const router = useRouter();
  const items = [
    ...NAV,
    { href: "/search", label: "Search", Icon: Search },
  ];
  return (
    <nav className={styles.tabbar} aria-label="Primary">
      {items.map(({ href, label, Icon }) => {
        const active = isActive(router.pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.tab} ${active ? styles.tabActive : ""}`}
            aria-current={active ? "page" : undefined}
            aria-label={label}
          >
            <Icon size={20} strokeWidth={2} />
            {active && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
