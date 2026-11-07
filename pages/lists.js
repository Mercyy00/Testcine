import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { Empty } from "../components/Page";
import { getTitle } from "../lib/data";
import {
  useList,
  useCustomLists,
  useReactions,
  useHistory,
  useProfiles,
  useActiveProfileId,
  createCustomList,
  deleteCustomList,
  clearCustomList,
  toggleCustomListItem,
  removeFromHistory,
} from "../lib/store";
import {
  Plus,
  Compass,
  Menu,
  ChevronLeft,
  XCircle,
  Trash2,
  Folder,
  Play,
  Info,
  ExternalLink,
  Check,
  ThumbsDown,
  ThumbsUp,
  Heart,
  X,
  Share2,
} from "lucide-react";
import styles from "../styles/Lists.module.css";

// Default liked titles matching user screenshot (Avengers: Endgame, Natsamrat)
const DEFAULT_LIKED = ["avengers-endgame", "natsamrat"];

export default function Lists() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useList();
  const [customLists, setCustomLists] = useCustomLists();
  const [reactions, setReactions] = useReactions();
  const [, setHistory] = useHistory();
  const [profiles] = useProfiles();
  const [activeProfileId] = useActiveProfileId();

  // Active profile info
  const activeProfile = useMemo(() => {
    return (profiles || []).find((p) => p.id === activeProfileId) || profiles?.[0] || {
      name: "Guest",
      avatar: "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    };
  }, [profiles, activeProfileId]);

  // Selected list ID for detail view: null (shows folder grid) | "watchlist" | "liked" | customList.id
  const [selectedListId, setSelectedListId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Sync selectedListId from router query (?id=liked or ?tab=liked or ?list=liked)
  useEffect(() => {
    if (router.isReady) {
      const q = router.query.id || router.query.list || router.query.tab;
      if (q) setSelectedListId(String(q).toLowerCase());
    }
  }, [router.isReady, router.query]);

  // Context Menu State: { item, x, y } | null
  const [contextMenu, setContextMenu] = useState(null);
  const [toast, setToast] = useState(null);

  const menuRef = useRef(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleClose = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("mousedown", handleClose);
    window.addEventListener("scroll", handleClose, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // Compute Liked titles
  const userLikedIds = useMemo(() => {
    const list = Object.entries(reactions || {})
      .filter(([_, r]) => r === "like" || r === "love")
      .map(([id]) => id);
    return list.length > 0 ? list : DEFAULT_LIKED;
  }, [reactions]);

  // Handle new list creation
  const handleCreateList = (e) => {
    e.preventDefault();
    const trimmed = (newListName || "").trim();
    if (!trimmed) return;
    const created = createCustomList(setCustomLists, trimmed);
    setNewListName("");
    setShowNewModal(false);
    if (created?.id) {
      setSelectedListId(created.id);
    }
  };

  // Determine active list details when inside a collection
  const activeCollection = useMemo(() => {
    if (!selectedListId) return null;
    if (selectedListId === "watchlist") {
      const items = (watchlist || []).map(getTitle).filter(Boolean);
      return {
        id: "watchlist",
        title: "Watchlist",
        items,
        isCustom: false,
        onClear: () => setWatchlist([]),
      };
    }
    if (selectedListId === "liked") {
      const items = userLikedIds.map(getTitle).filter(Boolean);
      return {
        id: "liked",
        title: "Liked",
        items,
        isCustom: false,
        onClear: () => {
          setReactions((prev) => {
            const next = { ...(prev || {}) };
            for (const id of userLikedIds) {
              if (next[id] === "like" || next[id] === "love") delete next[id];
            }
            return next;
          });
        },
      };
    }
    const custom = (customLists || []).find((l) => l.id === selectedListId);
    if (custom) {
      const items = (custom.items || []).map(getTitle).filter(Boolean);
      return {
        id: custom.id,
        title: custom.name,
        items,
        isCustom: true,
        onClear: () => clearCustomList(setCustomLists, custom.id),
        onDelete: () => {
          deleteCustomList(setCustomLists, custom.id);
          setSelectedListId(null);
        },
      };
    }
    return null;
  }, [selectedListId, watchlist, userLikedIds, customLists, setWatchlist, setCustomLists, setReactions]);

  // First title preview image helper
  const getPreviewImage = (ids) => {
    if (!ids || ids.length === 0) return null;
    for (const id of ids) {
      const t = getTitle(id);
      if (t?.backdrop) return t.backdrop;
      if (t?.poster) return t.poster;
    }
    return null;
  };

  // Handle right-click on an item
  const handleItemContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 240;
    const menuHeight = 390;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 16);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 16);
    setContextMenu({ item, x: Math.max(10, x), y: Math.max(10, y) });
  };

  // Context Menu Actions
  const handleResume = (item) => {
    setContextMenu(null);
    router.push(`/watch/${item.id}`);
  };

  const handleDetails = (item) => {
    setContextMenu(null);
    router.push(`/title/${item.id}`);
  };

  const handleOpenInNewTab = (item) => {
    setContextMenu(null);
    window.open(`/title/${item.id}`, "_blank");
  };

  const handleToggleWatchlist = (item) => {
    setContextMenu(null);
    const inWatchlist = (watchlist || []).includes(item.id);
    setWatchlist((l) =>
      inWatchlist ? l.filter((x) => x !== item.id) : [item.id, ...(l || [])]
    );
    showToast(inWatchlist ? "Removed from Watchlist" : "Added to Watchlist");
  };

  const handleToggleCustomList = (item, list) => {
    setContextMenu(null);
    toggleCustomListItem(setCustomLists, list.id, item.id);
    const inList = (list.items || []).includes(item.id);
    showToast(inList ? `Removed from "${list.name}"` : `Added to "${list.name}"`);
  };

  const handleReaction = (item, type) => {
    setContextMenu(null);
    setReactions((prev) => {
      const current = prev?.[item.id];
      const next = current === type ? null : type;
      return { ...(prev || {}), [item.id]: next };
    });
    showToast(
      type === "like"
        ? "Added to Liked"
        : type === "love"
        ? "Loved this"
        : "Disliked"
    );
  };

  const handleRemoveFromList = (item) => {
    setContextMenu(null);
    if (activeCollection?.id === "watchlist") {
      setWatchlist((l) => (l || []).filter((x) => x !== item.id));
      showToast("Removed from Watchlist");
    } else if (activeCollection?.isCustom) {
      toggleCustomListItem(setCustomLists, activeCollection.id, item.id);
      showToast(`Removed from "${activeCollection.title}"`);
    } else if (activeCollection?.id === "liked") {
      setReactions((r) => ({ ...(r || {}), [item.id]: null }));
      showToast("Removed from Liked");
    }
    // Also remove from continue watching / history
    removeFromHistory(setHistory, item.id);
  };

  const handleShare = (item) => {
    setContextMenu(null);
    const url = `${window.location.origin}/title/${item.id}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
    }
    showToast("Link copied to clipboard");
  };

  return (
    <Layout
      title={activeCollection ? activeCollection.title : "Lists"}
      description="Your personal watchlists and custom collections."
    >
      <div className={`pageInner ${styles.pageWrap}`}>
        {/* If viewing a specific list detail (Split View Matching User Reference) */}
        {activeCollection ? (
          <div>
            {/* Back Button: < Lists */}
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setSelectedListId(null)}
            >
              <ChevronLeft size={16} />
              <span>Lists</span>
            </button>

            <div className={styles.splitWrap}>
              {/* Left Side: Collection Card Banner */}
              <div className={styles.sideCard}>
                <div className={styles.sideImgWrap}>
                  {activeCollection.items.length > 0 && activeCollection.items[0]?.backdrop ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeCollection.items[0].backdrop}
                      alt={activeCollection.title}
                      className={styles.sideImg}
                    />
                  ) : (
                    <div className={styles.frontEmpty}>
                      <Folder size={36} opacity={0.3} />
                    </div>
                  )}
                </div>

                <h2 className={styles.sideTitle}>{activeCollection.title}</h2>

                {/* Profile Badge */}
                <div className={styles.profileBadge}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeProfile.avatar || "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg"}
                    alt={activeProfile.name || "Guest"}
                    className={styles.profileAvatar}
                  />
                  <span className={styles.profileName}>{activeProfile.name || "Guest"}</span>
                </div>

                <p className={styles.sideSub}>
                  {activeCollection.items.length}{" "}
                  {activeCollection.items.length === 1 ? "title" : "titles"}
                </p>

                {/* List Actions */}
                <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {activeCollection.onClear && activeCollection.items.length > 0 && (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={activeCollection.onClear}
                      title="Clear items from this list"
                    >
                      <XCircle size={13} />
                      <span>Clear</span>
                    </button>
                  )}

                  {activeCollection.isCustom && (
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      onClick={activeCollection.onDelete}
                      title="Delete this list"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Side: Numbered Tracklist of Items */}
              <div className={styles.listTrackList}>
                {activeCollection.items.length > 0 ? (
                  activeCollection.items.map((item, index) => {
                    const typeLabel =
                      item.type === "series" || item.type === "anime"
                        ? "Series"
                        : "Movie";

                    return (
                      <div
                        key={item.id}
                        className={styles.itemRow}
                        onClick={() => router.push(`/title/${item.id}`)}
                        onContextMenu={(e) => handleItemContextMenu(e, item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") router.push(`/title/${item.id}`);
                        }}
                      >
                        {/* Number */}
                        <span className={styles.itemRank}>{index + 1}</span>

                        {/* Thumbnail */}
                        <div className={styles.itemThumb}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.backdrop || item.poster}
                            alt={item.title}
                            className={styles.itemThumbImg}
                          />
                        </div>

                        {/* Title & Sub */}
                        <div className={styles.itemInfo}>
                          <h4 className={styles.itemTitle}>{item.title}</h4>
                          <p className={styles.itemSub}>
                            {typeLabel} · {item.year || 2026}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <Empty
                    title={`"${activeCollection.title}" is empty`}
                    text="Tap the + button on any movie or series to save titles to this list."
                    href="/discover"
                    cta="Find something to watch"
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Main Overview - Folder Collections Grid (Matches Image 2) */
          <>
            <div className={styles.topRow}>
              <h1 className={styles.pageTitle}>Lists</h1>

              <div className={styles.topActions}>
                <button
                  type="button"
                  className={styles.topBtn}
                  onClick={() => setShowNewModal(true)}
                >
                  <Plus size={16} />
                  <span>New list</span>
                </button>

                <Link href="/discover" className={styles.topBtn}>
                  <Compass size={16} />
                  <span>Discover</span>
                </Link>
              </div>
            </div>

            <div className={styles.folderGrid}>
              {/* 1. Watchlist Folder Card */}
              <button
                type="button"
                className={styles.folderCard}
                onClick={() => setSelectedListId("watchlist")}
              >
                <div className={styles.folderStack}>
                  <div className={styles.stackLayer2} />
                  <div className={styles.stackLayer1} />
                  <div className={styles.frontCard}>
                    {getPreviewImage(watchlist) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getPreviewImage(watchlist)}
                        alt="Watchlist preview"
                        className={styles.frontImg}
                      />
                    ) : (
                      <div className={styles.frontEmpty}>
                        <Folder size={32} opacity={0.3} />
                      </div>
                    )}
                    <div className={styles.frontShade} />
                    <div className={styles.countBadge}>
                      <Menu size={13} strokeWidth={2.5} />
                      <span>{(watchlist || []).length}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.folderMeta}>
                  <h3 className={styles.folderTitle}>Watchlist</h3>
                  <p className={styles.folderSub}>
                    {(watchlist || []).length}{" "}
                    {(watchlist || []).length === 1 ? "title" : "titles"}
                  </p>
                </div>
              </button>

              {/* 2. Liked Folder Card */}
              <button
                type="button"
                className={styles.folderCard}
                onClick={() => setSelectedListId("liked")}
              >
                <div className={styles.folderStack}>
                  <div className={styles.stackLayer2} />
                  <div className={styles.stackLayer1} />
                  <div className={styles.frontCard}>
                    {getPreviewImage(userLikedIds) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getPreviewImage(userLikedIds)}
                        alt="Liked preview"
                        className={styles.frontImg}
                      />
                    ) : (
                      <div className={styles.frontEmpty}>
                        <Folder size={32} opacity={0.3} />
                      </div>
                    )}
                    <div className={styles.frontShade} />
                    <div className={styles.countBadge}>
                      <Menu size={13} strokeWidth={2.5} />
                      <span>{userLikedIds.length}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.folderMeta}>
                  <h3 className={styles.folderTitle}>Liked</h3>
                  <p className={styles.folderSub}>
                    {userLikedIds.length}{" "}
                    {userLikedIds.length === 1 ? "title" : "titles"}
                  </p>
                </div>
              </button>

              {/* 3. Custom Lists Folders */}
              {(customLists || []).map((list) => {
                const count = (list.items || []).length;
                const preview = getPreviewImage(list.items);
                return (
                  <button
                    key={list.id}
                    type="button"
                    className={styles.folderCard}
                    onClick={() => setSelectedListId(list.id)}
                  >
                    <div className={styles.folderStack}>
                      <div className={styles.stackLayer2} />
                      <div className={styles.stackLayer1} />
                      <div className={styles.frontCard}>
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview}
                            alt={`${list.name} preview`}
                            className={styles.frontImg}
                          />
                        ) : (
                          <div className={styles.frontEmpty}>
                            <Folder size={32} opacity={0.3} />
                          </div>
                        )}
                        <div className={styles.frontShade} />
                        <div className={styles.countBadge}>
                          <Menu size={13} strokeWidth={2.5} />
                          <span>{count}</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.folderMeta}>
                      <h3 className={styles.folderTitle}>{list.name}</h3>
                      <p className={styles.folderSub}>
                        {count} {count === 1 ? "title" : "titles"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Working Right-Click Context Menu (Matches Image 3 Exactly) */}
        {contextMenu && (
          <div
            ref={menuRef}
            className={styles.contextMenu}
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Resume */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleResume(contextMenu.item)}
            >
              <Play size={14} fill="none" strokeWidth={2} />
              <span>Resume</span>
            </button>

            {/* 2. Details */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleDetails(contextMenu.item)}
            >
              <Info size={14} />
              <span>Details</span>
            </button>

            {/* 3. Open in new tab */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleOpenInNewTab(contextMenu.item)}
            >
              <ExternalLink size={14} />
              <span>Open in new tab</span>
            </button>

            {/* 4. Add to watchlist / In watchlist */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleToggleWatchlist(contextMenu.item)}
            >
              {(watchlist || []).includes(contextMenu.item.id) ? (
                <>
                  <Check size={14} />
                  <span>In watchlist</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Add to watchlist</span>
                </>
              )}
            </button>

            {/* 5. Custom lists toggles (e.g. marevel) */}
            {(customLists || []).map((cl) => {
              const inCustom = (cl.items || []).includes(contextMenu.item.id);
              return (
                <button
                  key={cl.id}
                  type="button"
                  className={`${styles.menuItem} ${inCustom ? styles.menuItemActive : ""}`}
                  onClick={() => handleToggleCustomList(contextMenu.item, cl)}
                >
                  <Menu size={14} />
                  <span>{cl.name}</span>
                  {inCustom && <Check size={12} style={{ marginLeft: "auto" }} />}
                </button>
              );
            })}

            {/* 6. Dislike */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleReaction(contextMenu.item, "dislike")}
            >
              <ThumbsDown
                size={14}
                fill={reactions?.[contextMenu.item.id] === "dislike" ? "currentColor" : "none"}
              />
              <span>Dislike</span>
            </button>

            {/* 7. I like this */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleReaction(contextMenu.item, "like")}
            >
              <ThumbsUp
                size={14}
                fill={reactions?.[contextMenu.item.id] === "like" ? "currentColor" : "none"}
              />
              <span>I like this</span>
            </button>

            {/* 8. Love this */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleReaction(contextMenu.item, "love")}
            >
              <Heart
                size={14}
                fill={reactions?.[contextMenu.item.id] === "love" ? "currentColor" : "none"}
              />
              <span>Love this</span>
            </button>

            {/* 9. Remove from continue watching / remove from list */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleRemoveFromList(contextMenu.item)}
            >
              <X size={14} />
              <span>
                {activeCollection?.id === "watchlist"
                  ? "Remove from watchlist"
                  : activeCollection?.id === "liked"
                  ? "Remove from liked"
                  : activeCollection
                  ? `Remove from ${activeCollection.title}`
                  : "Remove from continue watching"}
              </span>
            </button>

            {/* 10. Share */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleShare(contextMenu.item)}
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>
          </div>
        )}

        {/* Create New List Modal */}
        {showNewModal && (
          <div className={styles.modalBackdrop} onClick={() => setShowNewModal(false)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>Create New List</h2>
              <form onSubmit={handleCreateList}>
                <div className={styles.inputGroup}>
                  <label htmlFor="list-name" className={styles.label}>
                    List Name
                  </label>
                  <input
                    id="list-name"
                    type="text"
                    placeholder="e.g. Marvel Movies, Anime Binge"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className={styles.input}
                    autoFocus
                    maxLength={32}
                    required
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setShowNewModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.saveBtn}
                    disabled={!newListName.trim()}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    </Layout>
  );
}
