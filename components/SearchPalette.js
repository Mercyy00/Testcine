import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Search, Clock, X } from "lucide-react";
import Art from "./Art";
import { searchTitles, TYPE_LABEL, TITLES } from "../lib/data";
import { useSearches } from "../lib/store";
import styles from "./SearchPalette.module.css";

export default function SearchPalette({ autoFocus = false, wide = false }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searches, setSearches] = useSearches();
  const [liveResults, setLiveResults] = useState([]);
  const wrap = useRef(null);
  const input = useRef(null);

  const localResults = useMemo(() => searchTitles(q), [q]);

  useEffect(() => {
    if (!q.trim()) {
      setLiveResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}&limit=8`, {
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (!controller.signal.aborted && Array.isArray(data)) {
            setLiveResults(data);
          }
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            // Ignore aborts
          }
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const seen = new Set();
    const merged = [];
    [...liveResults, ...localResults].forEach((t) => {
      if (t && !seen.has(t.id) && !seen.has(t.title.toLowerCase())) {
        seen.add(t.id);
        seen.add(t.title.toLowerCase());
        merged.push(t);
      }
    });
    return merged.slice(0, 8);
  }, [q, liveResults, localResults]);

  const recents = searches.slice(0, 2);
  const suggestions = useMemo(() => TITLES.filter((t) => t.status !== "upcoming").slice(0, 5), []);

  // Flat list of rows so arrow keys can move across both sections.
  const rows = useMemo(() => {
    if (q.trim()) return results.map((t) => ({ kind: "title", t }));
    return [
      ...recents.map((text) => ({ kind: "recent", text })),
      ...suggestions.map((t) => ({ kind: "title", t })),
    ];
  }, [q, results, recents, suggestions]);

  useEffect(() => setActive(-1), [q, open]);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onDown = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      const typing = /input|textarea/i.test(document.activeElement?.tagName || "");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
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
    setSearches((s) => [v, ...s.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8));
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
      <div className={styles.dockField}>
        <input
          ref={input}
          id="site-search"
          className={styles.input}
          type="search"
          placeholder="Search"
          value={q}
          autoComplete="off"
          spellCheck={false}
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
            onClick={() => {
              setQ("");
              input.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        )}
        <button
          type="button"
          className={styles.go}
          onClick={submit}
          aria-label="Search"
        >
          <Search size={20} strokeWidth={2.2} />
        </button>
      </div>

      {open && (
        <div className={styles.drop} id="search-listbox" role="listbox">
          {rows.length === 0 && q.trim() ? (
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
                    <span className={styles.lead}>
                      {row.kind === "recent" ? <Clock size={18} /> : <Search size={18} />}
                    </span>
                    {row.kind === "recent" ? (
                      <span className={styles.label}>{row.text}</span>
                    ) : (
                      <>
                        <span className={styles.label}>{row.t.title}</span>
                        <span className={styles.sub}>
                          {row.t.year} {TYPE_LABEL[row.t.type]}
                        </span>
                        <span className={styles.art}>
                          <Art title={row.t} showTitle={false} />
                        </span>
                      </>
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
