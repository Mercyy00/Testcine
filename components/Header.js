import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { DEFAULT_AVATAR } from "../lib/avatars";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  House,
  Clapperboard,
  TvMinimal,
  Drama,
  Search,
  MessageCircle,
  Bell,
  LogOut,
  LogIn,
  UserRound,
  Bookmark,
  Clock,
  Download,
  CalendarClock,
  Compass,
  Users,
  Settings,
  CheckCheck,
  X,
  Shield,
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
  useSchedule,
  useReadNotifications,
  useDismissedNotifications,
} from "../lib/store";
import { buildDynamicNotifications } from "../lib/notifications";
import styles from "./Header.module.css";

export const NAV = [
  { href: "/", label: "Home", Icon: House, match: ["/"] },
  { href: "/browse/movie", label: "Movies", Icon: Clapperboard, match: ["/browse/movie", "/movies"] },
  { href: "/browse/tv", label: "Series", Icon: TvMinimal, match: ["/browse/tv", "/series"] },
  { href: "/anime", label: "Anime", Icon: Drama, match: ["/anime"] },
];

const isActive = (path, item) => {
  if (item.match) {
    return item.match.some((m) => (m === "/" ? path === "/" : path.startsWith(m)));
  }
  return item.href === "/" ? path === "/" : path.startsWith(item.href);
};

function Discord(props) {
  return (
    <svg viewBox="0 0 127.14 96.36" width="17" height="13" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
    </svg>
  );
}

export function Avatar({
  name = "Guest",
  image = DEFAULT_AVATAR,
  size = 46,
}) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      <span className={styles.avatarWrap} style={{ width: size, height: size }} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          className={styles.avatarImg}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      <UserRound size={Math.round(size * 0.48)} strokeWidth={1.8} />
    </span>
  );
}

export default function Header() {
  const router = useRouter();
  const [settings] = useSettings();
  const [profiles] = useProfiles();
  const [activeProfileId] = useActiveProfileId();
  const [history] = useHistory();
  const [watchlist] = useList();
  const [schedule] = useSchedule();
  const [readIds, setReadIds] = useReadNotifications();
  const [dismissedIds, setDismissedIds] = useDismissedNotifications();
  const [activeToastNotif, setActiveToastNotif] = useState(null);

  // Notification Filter Tab: "all" | "unread" | "mentions"
  const [notifTab, setNotifTab] = useState("all");
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          setScrolled(currentY > 16);

          if (currentY <= 64) {
            setHidden(false);
          } else if (currentY > lastScrollY.current + 10) {
            // Scrolling down
            setHidden(true);
          } else if (currentY < lastScrollY.current - 10) {
            // Scrolling up
            setHidden(false);
          }
          lastScrollY.current = Math.max(0, currentY);
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: session, status: authStatus } = useSession();
  const signedIn = authStatus === "authenticated";

  const navRef = useRef(null);
  const linkRefs = useRef({});
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0, opacity: 0 });

  const activeProfile =
    (profiles || []).find((p) => p.id === activeProfileId) ||
    profiles?.[0] ||
    null;

  const name = session?.user?.name || activeProfile?.name || settings.name || "Guest";
  const avatarImage =
    activeProfile?.avatar ||
    settings.avatar ||
    DEFAULT_AVATAR;
  const email = session?.user?.email || "Not signed in";

  // Real Dynamic Behavior Pattern Notifications
  const notificationsData = useMemo(() => {
    return buildDynamicNotifications({
      history,
      watchlist,
      schedule,
      readIds,
      dismissedIds,
    });
  }, [history, watchlist, schedule, readIds, dismissedIds]);

  const unread = notificationsData.unreadCount;

  // In-app alert when opening website on airing day
  useEffect(() => {
    if (typeof window === "undefined") return;
    const todayUnread = (notificationsData.today || []).find((n) => n.unread);
    if (!todayUnread) {
      setActiveToastNotif(null);
      return;
    }
    const sessionKey = `viv:airing_today_alert_${todayUnread.id}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      setActiveToastNotif(todayUnread);
      const timer = setTimeout(() => {
        setActiveToastNotif(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [notificationsData.today]);

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

  // Determine active route key
  const activeHref = useMemo(() => {
    const path = router.pathname;
    if (path === "/" || path === "") return "/";
    for (const item of NAV) {
      if (item.match) {
        if (item.match.some((m) => m !== "/" && path.startsWith(m))) return item.href;
      } else if (item.href !== "/" && path.startsWith(item.href)) {
        return item.href;
      }
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

  return (
    <header className={`${styles.bar} ${scrolled ? styles.barScrolled : ""} ${hidden ? styles.barHidden : ""}`} data-dock="true">
      {/* 1. Bar Start: Brand Logo + Capsule with sliding link pill and links */}
      <div className={styles.barStart}>
        <Link href="/" className={styles.brandLink} aria-label="DIVINE Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="DIVINE" className={styles.brandLogo} />
        </Link>
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
          {NAV.map((item) => {
            const active = isActive(router.pathname, item);
            const { href, label, Icon } = item;
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
                  <span style={{ display: "inline-flex", flex: "0 0 auto", transform: "none" }}>
                    <Icon size={22} strokeWidth={2} />
                  </span>
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 2. Center: Docked Search Palette */}
      <div className={styles.dock} role="search">
        <SearchPalette />
      </div>

      {/* 3. Bar End: Round glass buttons (Watch party, Notifications bell, Profile avatar) */}
      <div className={styles.barEnd}>
        {/* Watch party / community chat */}
        <span className={styles.tooltipWrap}>
          <Link href="/watch-party" className={styles.round} aria-label="Chat">
            <span style={{ display: "inline-flex", flex: "0 0 auto", transform: "none" }}>
              <MessageCircle size={20} strokeWidth={1.8} />
            </span>
          </Link>
        </span>

        {/* Notifications */}
        <span className={styles.bellSlot}>
          <Popover
            label="Notifications"
            trigger={
              <span
                className={styles.round}
                aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
              >
                <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
                  <Bell size={20} strokeWidth={1.8} />
                </span>
                {unread > 0 && <span className={styles.notifDot} aria-hidden="true" />}
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
        </span>

        {/* Profile Avatar & Account Menu */}
        <div className={styles.account}>
          <Popover
            label="Account"
            trigger={
              <span className={styles.avatarBtn} aria-label="Account">
                <Avatar name={name} image={avatarImage} size={46} />
              </span>
            }
            panelClass={styles.menu}
          >
            <Link href={profileHref} className={styles.menuHead} role="menuitem">
              <div className={styles.menuAvatar}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarImage}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
              </div>
              <div className={styles.menuInfo}>
                <div className={styles.menuName}>{name}</div>
                <div className={styles.menuEmail}>{email}</div>
              </div>
            </Link>
            <button
              type="button"
              role="menuitem"
              className={`${styles.menuItem} ${styles.menuBad}`}
              onClick={() => (signedIn ? signOut({ callbackUrl: "/" }) : router.push("/auth/signin"))}
            >
              <span style={{ display: "inline-flex", flex: "0 0 auto", transform: "none" }}>
                {signedIn ? <LogOut size={17} strokeWidth={1.8} /> : <LogIn size={17} strokeWidth={1.8} />}
              </span>
              {signedIn ? "Log out" : "Sign in"}
            </button>
            <span className={styles.menuDivide} />
            <Link href="/profiles" role="menuitem" className={styles.menuItem}>
              <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
                <UserRound size={17} strokeWidth={1.8} />
              </span>
              Switch profiles
            </Link>
            <Link href="/watchlist" role="menuitem" className={styles.menuItem}>
              <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
                <Bookmark size={17} strokeWidth={1.8} />
              </span>
              Lists
            </Link>
            <Link href="/history" role="menuitem" className={styles.menuItem}>
              <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
                <Clock size={17} strokeWidth={1.8} />
              </span>
              History
            </Link>
            <Link href="/downloads" role="menuitem" className={styles.menuItem}>
              <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
                <Download size={17} strokeWidth={1.8} />
              </span>
              Downloads
            </Link>
            <Link href="/schedule" role="menuitem" className={styles.menuItem}>
              <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
                <CalendarClock size={17} strokeWidth={1.8} />
              </span>
              Schedule
            </Link>
            <Link href="/discover" role="menuitem" className={styles.menuItem}>
              <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
                <Compass size={17} strokeWidth={1.8} />
              </span>
              Discover
            </Link>
            <Link href="/watch-party" role="menuitem" className={styles.menuItem}>
              <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
                <Users size={17} strokeWidth={1.8} />
              </span>
              Watch party
            </Link>
            <Link href="/settings" role="menuitem" className={styles.menuItem}>
              <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
                <Settings size={17} strokeWidth={1.8} />
              </span>
              Settings
            </Link>
            {session?.user?.role === "ADMIN" && (
              <Link href="/admin/users" role="menuitem" className={styles.menuItem}>
                <span style={{ display: "inline-flex", flex: "0 0 auto", color: "var(--primary, #00e599)" }}>
                  <Shield size={17} strokeWidth={1.8} />
                </span>
                Admin Dashboard
              </Link>
            )}
            {BRAND.discord && (
              <a href={BRAND.discord} target="_blank" rel="noreferrer" role="menuitem" className={styles.menuItem}>
                <Discord />
                Discord
              </a>
            )}
          </Popover>
        </div>
      </div>

      {/* 4. Active In-App Airing Today Toast / Alert */}
      {activeToastNotif && (
        <div className={styles.airingToast} role="alert">
          {activeToastNotif.poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeToastNotif.poster}
              alt={activeToastNotif.title}
              className={styles.airingToastPoster}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <div
            className={styles.airingToastBody}
            onClick={() => handleNotifClick(activeToastNotif)}
          >
            <div className={styles.airingToastHead}>
              <span className={styles.airingToastBadge}>Airing Today</span>
              {activeToastNotif.network && (
                <span className={styles.airingToastTime}>{activeToastNotif.network}</span>
              )}
            </div>
            <b className={styles.airingToastTitle}>{activeToastNotif.title}</b>
            <p className={styles.airingToastSub}>{activeToastNotif.subtitle}</p>
          </div>
          <button
            type="button"
            className={styles.airingToastClose}
            onClick={(e) => {
              handleDismissNotif(e, activeToastNotif.id);
              setActiveToastNotif(null);
            }}
            aria-label={`Dismiss notification for ${activeToastNotif.title}`}
            title="Dismiss / Skip"
          >
            <X size={14} strokeWidth={2.4} />
          </button>
        </div>
      )}
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
      {items.map((item) => {
        const { href, label, Icon } = item;
        const active = isActive(router.pathname, item);
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
