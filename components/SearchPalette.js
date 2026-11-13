import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Search, Clock, X } from "lucide-react";
import Art from "./Art";
import { TYPE_LABEL } from "../lib/constants";
import { useSearches } from "../lib/store";
import styles from "./SearchPalette.module.css";

export default function SearchPalette({ autoFocus = false, wide = false }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searches, setSearches] = useSearches();
  const [liveResults, setLiveResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [didYouMean, setDidYouMean] = useState(null);
  const [loading, setLoading] = useState(false);
  const wrap = useRef(null);
  const input = useRef(null);

  // Sync search input with URL query when on /search page
  useEffect(() => {
    if (router.isReady && router.pathname === "/search" && typeof router.query.q === "string") {
      setQ(router.query.q);
    }
  }, [router.isReady, router.pathname, router.query.q]);

  // Fetch top trending titles for default suggestions when input is empty & no history
  useEffect(() => {
    let mounted = true;
    fetch("/api/tmdb/discover?category=trending&type=movie&time_window=week")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setTrending(data.slice(0, 8));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const query = q.trim();
    if (!query) {
      setLiveResults([]);
      setDidYouMean(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}&limit=8`, {
        signal: controller.signal,
      })
        .then(async (r) => {
          if (!active || controller.signal.aborted) return null;
          const suggestion = r.headers.get("X-Did-You-Mean");
          const data = r.ok ? await r.json() : [];
          return { data, suggestion };
        })
        .then((res) => {
          if (!res) return;
          const { data, suggestion } = res;
          if (active && !controller.signal.aborted) {
            const items = Array.isArray(data) ? data : data?.results || [];
            setLiveResults(items);
            setDidYouMean(suggestion || data?.didYouMean || null);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (err.name !== "AbortError" && active) {
            setLoading(false);
          }
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    return liveResults.slice(0, 8);
  }, [q, liveResults]);

  const recents = searches.slice(0, 10);

  // Flat list of rows: search results, or recent searches, or trending suggestions
  const rows = useMemo(() => {
    if (q.trim()) return results.map((t) => ({ kind: "title", t }));
    if (recents.length > 0) return recents.map((text) => ({ kind: "recent", text }));
    return trending.map((t) => ({ kind: "title", t }));
  }, [q, results, recents, trending]);

  useEffect(() => {
    setActive(-1);
  }, [q, open]);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [autoFocus]);

  useEffect(() => {
    const onDown = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      const typing = /input|textarea/i.test(document.activeElement?.tagName || "");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const remember = (text) => {
    const v = text.trim();
    if (!v) return;
    setSearches((s) => [v, ...s.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 10));
  };

  const go = (row) => {
    setOpen(false);
    input.current?.blur();
    if (row.kind === "title") {
      remember(row.t.title);
      setQ("");
      router.push(`/title/${row.t.id}`);
    } else {
      setQ(row.text);
      router.push(`/search?q=${encodeURIComponent(row.text)}`);
    }
  };

  const submit = () => {
    if (active >= 0 && rows[active]) return go(rows[active]);
    if (!q.trim()) return;
    remember(q);
    setOpen(false);
    input.current?.blur();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % Math.max(rows.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? rows.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    }
  };

  return (
    <div className={`${styles.dock} ${wide ? styles.wide : ""}`} ref={wrap}>
      <div className={styles.dockField} onClick={() => input.current?.focus()}>
        <input
          ref={input}
          id="site-search"
          className={styles.input}
          type="search"
          placeholder="Search"
          value={q}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-listbox"
          aria-activedescendant={active >= 0 ? `sr-${active}` : undefined}
          aria-label="Search"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {q && (
          <button
            type="button"
            className={styles.wipe}
            onClick={(e) => {
              e.stopPropagation();
              setQ("");
              if (router.pathname === "/search") {
                router.replace({ pathname: "/search" }, undefined, { shallow: true });
              }
              input.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={15} strokeWidth={2.4} />
          </button>
        )}
        <div className={styles.searchDivider} />
        <button
          type="button"
          className={styles.searchSubmitBtn}
          onClick={(e) => {
            e.stopPropagation();
            submit();
          }}
          aria-label="Search"
          title="Search"
        >
          <Search size={17} strokeWidth={2.2} />
        </button>
      </div>

      {open && (
        <div className={styles.drop} id="search-listbox" role="listbox">
          {didYouMean && (
            <div
              style={{
                padding: "8px 16px",
                fontSize: 12,
                color: "rgba(255, 255, 255, 0.7)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(220, 38, 38, 0.08)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>Showing results for</span>
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  color: "#f87171",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                  font: "inherit",
                }}
                onClick={() => setQ(didYouMean)}
              >
                {didYouMean}
              </button>
            </div>
          )}
          {loading && rows.length === 0 ? (
            <p className={styles.none}>Searching...</p>
          ) : rows.length === 0 && q.trim() ? (
            <p className={styles.none}>No titles match “{q.trim()}”. Try a genre or a year.</p>
          ) : (
            <ul className={styles.list}>
              {rows.map((row, i) => (
                <li key={row.kind + (row.t?.id || row.text)} id={`sr-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    className={`${styles.row} ${i === active ? styles.rowOn : ""}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(row)}
                  >
                    {row.kind === "recent" ? (
                      <>
                        <span className={styles.lead}>
                          <Clock size={16} />
                        </span>
                        <span className={styles.label}>{row.text}</span>
                      </>
                    ) : (
                      <div className={styles.resultItem}>
                        <span className={styles.lead}>
                          <Search size={16} strokeWidth={2} />
                        </span>
                        <div className={styles.resultContent}>
                          <span className={styles.resultTitle}>{row.t.title}</span>
                          <span className={styles.resultMeta}>
                            {row.t.year ? `${row.t.year} ` : ""}
                            {TYPE_LABEL[row.t.type] || (row.t.type === "tv" ? "Series" : "Movie")}
                          </span>
                        </div>
                        <div className={styles.resultPoster}>
                          <Art title={row.t} variant="poster" showTitle={false} />
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!q.trim() && recents.length > 0 && (
            <button type="button" className={styles.clear} onClick={() => setSearches([])}>
              Clear search history
            </button>
          )}
        </div>
      )}
    </div>
  );
}
