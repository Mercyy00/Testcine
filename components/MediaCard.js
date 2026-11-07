import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useToast } from "../lib/useToast";
import {
  Plus,
  Check,
  Play,
  MoreHorizontal,
  ThumbsDown,
  ThumbsUp,
  Heart,
  ListPlus,
  Calendar,
  X,
  Share2,
  ChevronRight,
} from "lucide-react";
import Art from "./Art";
import {
  useList,
  useHistory,
  touchHistory,
  useCustomLists,
  useReactions,
  useSchedule,
  toggleCustomListItem,
  toggleScheduleItem,
  removeFromHistory,
  createCustomList,
  inList,
  toggleListEntry,
} from "../lib/store";
import styles from "./MediaCard.module.css";

export default function MediaCard({
  title,
  rank,
  progress,
  timeLeft,
  wide = true,
  hideMeta = false,
  badge,
  fluid = false,
}) {
  const [list, setList] = useList();
  const [, setHistory] = useHistory();
  const [customLists, setCustomLists] = useCustomLists();
  const [reactions, setReactions] = useReactions();
  const [schedule, setSchedule] = useSchedule();

  const [openMenu, setOpenMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showSubList, setShowSubList] = useState(false);
  const [toast, showToast] = useToast(2400);
  const [logoFailed, setLogoFailed] = useState(false);
  const [asyncLogo, setAsyncLogo] = useState(null);

  const menuRef = useRef(null);

  // Lazily fetch logo if this is a wide card without a logo pre-attached
  useEffect(() => {
    if (!wide || !title || title.logo || asyncLogo || logoFailed) return;
    const tid = title.tmdbId || (typeof title.id === "string" && title.id.match(/\d+$/)?.[0]);
    if (!tid) return;

    let active = true;
    const mediaType =
      title.type === "series" || title.type === "anime" || title.type === "tv" ? "tv" : "movie";

    fetch(`/api/tmdb/logo?id=${tid}&type=${mediaType}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.logo) {
          setAsyncLogo(data.logo);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [wide, title.logo, title.tmdbId, title.id, title.type, asyncLogo, logoFailed]);

  const activeLogo = title.logo || asyncLogo;

  // Close context menu on outside events or when another card opens its menu
  useEffect(() => {
    if (!openMenu) return;

    const handleClose = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
        setShowSubList(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenMenu(false);
        setShowSubList(false);
      }
    };
    const handleOtherMenu = (e) => {
      if (e.detail !== title.id) {
        setOpenMenu(false);
        setShowSubList(false);
      }
    };

    window.addEventListener("mousedown", handleClose);
    window.addEventListener("scroll", handleClose, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("viv:close-card-menu", handleOtherMenu);
    return () => {
      window.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("viv:close-card-menu", handleOtherMenu);
    };
  }, [openMenu, title?.id]);

  if (!title) return null;

  const saved = inList(list, title.id);
  const inSchedule = (schedule || []).includes(title.id);
  const reaction = reactions?.[title.id] || null;
  const isContinueWatching = typeof progress === "number";

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleListEntry(setList, title.id, title);
    showToast(saved ? "Removed from watchlist" : "Added to watchlist");
  };

  const handleCardClick = () => {
    touchHistory(setHistory, title.id, 0.15, undefined, title);
  };

  // Open context menu on right click
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Close any other open menus
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("viv:close-card-menu", { detail: title.id }));
    }

    const menuWidth = 230;
    const menuHeight = isContinueWatching ? 270 : 180;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 16);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 16);
    setMenuPos({ x: Math.max(12, x), y: Math.max(12, y) });
    setShowSubList(false);
    setOpenMenu(true);
  };

  // Open menu on clicking the 3 dots button
  const handleMoreClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (openMenu) {
      setOpenMenu(false);
      setShowSubList(false);
      return;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("viv:close-card-menu", { detail: title.id }));
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = isContinueWatching ? 270 : 180;
    const x = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 16);
    const y = Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 16);
    setMenuPos({ x: Math.max(12, x), y: Math.max(12, y) });
    setShowSubList(false);
    setOpenMenu(true);
  };

  // Reactions
  const handleReaction = (type) => {
    setReactions((prev) => ({
      ...(prev || {}),
      [title.id]: prev?.[title.id] === type ? null : type,
    }));
    setOpenMenu(false);
    setShowSubList(false);
    const label =
      type === "dislike"
        ? "Marked as Not for me"
        : type === "like"
        ? "Added to Liked"
        : "Added to favorites";
    showToast(label);
  };

  // Watchlist toggle from menu
  const handleToggleWatchlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleListEntry(setList, title.id, title);
    setOpenMenu(false);
    setShowSubList(false);
    showToast(saved ? "Removed from watchlist" : "Added to watchlist");
  };

  // Custom list toggle
  const handleToggleCustomList = (cl) => {
    toggleCustomListItem(setCustomLists, cl.id, title.id);
    const inList = (cl.items || []).includes(title.id);
    showToast(inList ? `Removed from "${cl.name}"` : `Added to "${cl.name}"`);
    setOpenMenu(false);
    setShowSubList(false);
  };

  // Add to schedule toggle
  const handleToggleSchedule = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleScheduleItem(setSchedule, title.id);
    setOpenMenu(false);
    setShowSubList(false);
    showToast(inSchedule ? `Removed "${title.title}" from schedule` : `Added "${title.title}" to schedule`);
  };

  // Remove from continue watching
  const handleRemoveFromContinueWatching = (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromHistory(setHistory, title.id);
    setOpenMenu(false);
    setShowSubList(false);
    showToast(`Removed "${title.title}" from continue watching`);
  };

  // Share
  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu(false);
    setShowSubList(false);
    const url = typeof window !== "undefined" ? `${window.location.origin}/title/${title.id}` : "";
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Link copied");
    }
  };

  // Badge logic matching user screenshot:
  const activeBadge = !rank
    ? badge || title.badge || (title.status === "airing" && title.type === "series" ? "New episode" : null)
    : null;

  // Format rating: 1 decimal place (e.g. 7.3, 7.0, 8.5)
  const displayRating =
    typeof title.rating === "number"
      ? Number(title.rating).toFixed(1)
      : title.rating || null;

  // Quality label (HD)
  const displayQuality = title.quality || (title.type === "movie" ? "HD" : null);

  // Remaining time
  const formatTimeLeft = (val) => {
    if (!val) return null;
    if (typeof val === "string" && val.includes("left")) return val;
    const mins = typeof val === "number" ? val : parseInt(val, 10);
    if (Number.isNaN(mins) || mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  };

  const remainingTime =
    formatTimeLeft(timeLeft) ||
    (isContinueWatching && progress > 0
      ? (() => {
          const rem = Math.round((title.runtime || 120) * (1 - progress));
          const h = Math.floor(rem / 60);
          const m = rem % 60;
          return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
        })()
      : null);

  const subMenuIsLeft = typeof window !== "undefined" && menuPos.x + 230 + 190 > window.innerWidth;

  return (
    <div
      className={`${styles.card} ${wide ? styles.wide : styles.poster} ${
        fluid ? styles.fluid : ""
      }`}
      onContextMenu={handleContextMenu}
    >
      <Link
        href={`/title/${title.id}`}
        className={styles.link}
        onClick={handleCardClick}
        aria-label={title.title}
      >
        <span className={styles.art}>
          <Art
            title={title}
            variant={wide ? "backdrop" : "poster"}
            showTitle={false}
            className={styles.img}
          />
          <span className={styles.shade} />

          {/* Title treatment on the tile (Logo PNG only - no duplicate text) */}
          {wide && activeLogo && !logoFailed && (
            <span className={styles.tileTitleWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeLogo}
                alt={title.title}
                className={styles.tileLogo}
                loading="lazy"
                decoding="async"
                onError={() => setLogoFailed(true)}
              />
            </span>
          )}

          {/* Top-left Notch Cutout (Rank, HD, Cam, New episode) */}
          {rank ? (
            <span className={styles.notch}>
              <span className={styles.badgeRank}>{rank}</span>
            </span>
          ) : activeBadge ? (
            <span className={styles.notch}>
              <span
                className={
                  activeBadge.toLowerCase() === "cam"
                    ? styles.badgeCam
                    : activeBadge.toLowerCase() === "new episode"
                    ? styles.badgeNew
                    : styles.badgeHd
                }
              >
                {activeBadge.toLowerCase() === "cam" ? "Cam" : activeBadge}
              </span>
            </span>
          ) : null}

          <span className={styles.hoverPlay}>
            <Play size={20} fill="currentColor" />
          </span>

          {typeof progress === "number" && progress > 0 && (
            <span className={styles.progress}>
              <i style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
          )}
        </span>

        {!hideMeta && (
          <span className={styles.meta}>
            <span className={styles.name} title={title.title}>
              {title.title}
            </span>
            <span className={styles.sub}>
              {isContinueWatching ? (
                <>
                  <span className={styles.year}>{title.year || 2026}</span>
                  {remainingTime && (
                    <>
                      <span className={styles.dot}>·</span>
                      <span className={styles.timeLeft}>{remainingTime}</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  {displayRating ? (
                    <>
                      <span className={styles.star}>★</span>
                      <span className={styles.ratingVal}>{displayRating}</span>
                      <span className={styles.dot}>·</span>
                    </>
                  ) : null}
                  <span className={styles.year}>{title.year || 2026}</span>
                  {displayQuality ? (
                    <>
                      <span className={styles.dot}>·</span>
                      <span className={styles.quality}>{displayQuality}</span>
                    </>
                  ) : null}
                </>
              )}
            </span>
          </span>
        )}
      </Link>

      {/* Top right buttons (More options ... and Watchlist + / ✓) */}
      <div className={styles.cardActionsTop}>
        <button
          type="button"
          className={styles.moreBtn}
          onClick={handleMoreClick}
          aria-label="More options"
          title="More options"
        >
          <MoreHorizontal size={15} />
        </button>

        <button
          type="button"
          className={styles.save}
          onClick={toggle}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${title.title} from My list` : `Add ${title.title} to My list`}
        >
          {saved ? <Check size={14} strokeWidth={2.8} /> : <Plus size={14} strokeWidth={2.8} />}
        </button>
      </div>

      {/* Full-screen invisible backdrop to dismiss context menu */}
      {openMenu && (
        <div
          className={styles.backdrop}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpenMenu(false);
            setShowSubList(false);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpenMenu(false);
            setShowSubList(false);
          }}
        />
      )}

      {/* Context Menu matching user screenshots 1 & 2 */}
      {openMenu && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{
            top: `${menuPos.y}px`,
            left: `${menuPos.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Reaction Bar */}
          <div className={styles.reactionRow}>
            <button
              type="button"
              className={`${styles.reactBtn} ${reaction === "dislike" ? styles.reactActive : ""}`}
              onClick={() => handleReaction("dislike")}
              aria-label="Not for me"
              title="Not for me"
            >
              <ThumbsDown size={17} fill={reaction === "dislike" ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              className={`${styles.reactBtn} ${reaction === "like" ? styles.reactActive : ""}`}
              onClick={() => handleReaction("like")}
              aria-label="I like this"
              title="I like this"
            >
              <ThumbsUp size={17} fill={reaction === "like" ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              className={`${styles.reactBtn} ${reaction === "love" ? styles.reactActive : ""}`}
              onClick={() => handleReaction("love")}
              aria-label="Love this"
              title="Love this"
            >
              <Heart size={17} fill={reaction === "love" ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Watchlist toggle */}
          <button
            type="button"
            className={styles.menuItem}
            onClick={handleToggleWatchlist}
          >
            {saved ? <Check size={15} strokeWidth={2.4} /> : <Plus size={15} strokeWidth={2.4} />}
            <span>{saved ? "Remove from watchlist" : "Add to watchlist"}</span>
          </button>

          {/* Add to list > */}
          <div
            className={styles.subTriggerWrap}
            onMouseEnter={() => setShowSubList(true)}
            onMouseLeave={() => setShowSubList(false)}
          >
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => setShowSubList((s) => !s)}
            >
              <ListPlus size={15} />
              <span>Add to list</span>
              <ChevronRight size={14} className={styles.subChevron} />
            </button>

            {showSubList && (
              <div className={`${styles.subMenu} ${subMenuIsLeft ? styles.subMenuLeft : ""}`}>
                <div className={styles.subMenuHead}>Add to list</div>
                {customLists && customLists.length > 0 ? (
                  customLists.map((cl) => {
                    const inList = (cl.items || []).includes(title.id);
                    return (
                      <button
                        key={cl.id}
                        type="button"
                        className={`${styles.subMenuItem} ${
                          inList ? styles.subMenuItemActive : ""
                        }`}
                        onClick={() => handleToggleCustomList(cl)}
                      >
                        <span>{cl.name}</span>
                        {inList && <Check size={14} strokeWidth={2.6} />}
                      </button>
                    );
                  })
                ) : (
                  <div className={styles.subEmpty}>No lists yet</div>
                )}
              </div>
            )}
          </div>

          {/* Continue Watching specific actions */}
          {isContinueWatching && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={handleToggleSchedule}
            >
              <Calendar size={15} />
              <span>{inSchedule ? "Remove from schedule" : "Add to schedule"}</span>
            </button>
          )}

          {isContinueWatching && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={handleRemoveFromContinueWatching}
            >
              <X size={15} />
              <span>Remove from continue watching</span>
            </button>
          )}

          {/* Share */}
          <button
            type="button"
            className={styles.menuItem}
            onClick={handleShare}
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>
        </div>
      )}

      {/* Floating toast */}
      {toast && <div className={styles.cardToast}>{toast}</div>}
    </div>
  );
}
