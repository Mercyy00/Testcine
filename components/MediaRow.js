import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
import styles from "./MediaRow.module.css";

// Section wrapper with a heading, an optional filter chip and a snapping scroller.
export default function MediaRow({ title, href, menu, children, className = "" }) {
  const scroller = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const page = (dir) => {
    const el = scroller.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.86, behavior: "smooth" });
  };

  return (
    <section className={`${styles.section} ${className}`}>
      <header className={styles.head}>
        <h2 className={styles.title}>
          {href ? (
            <Link href={href} className={styles.titleLink}>
              {title}
              <ChevronRight size={20} strokeWidth={2.6} />
            </Link>
          ) : (
            title
          )}
        </h2>
        {menu && (
          <div className={styles.menuWrap} ref={menuRef}>
            <button
              type="button"
              className={`${styles.menuTrigger} chip`}
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {menu.options.find((o) => o.value === menu.value)?.label}
              <ChevronDown size={16} strokeWidth={2.6} />
            </button>
            {open && (
              <ul className={styles.menu} role="listbox">
                {menu.options.map((o) => (
                  <li key={o.value} role="option" aria-selected={o.value === menu.value}>
                    <button
                      type="button"
                      onClick={() => {
                        menu.onChange(o.value);
                        setOpen(false);
                      }}
                    >
                      {o.label}
                      {o.value === menu.value && <Check size={15} strokeWidth={2.6} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className={styles.arrows}>
          <button type="button" onClick={() => page(-1)} disabled={edge.start} aria-label="Scroll left">
            <ChevronLeft size={18} strokeWidth={2.6} />
          </button>
          <button type="button" onClick={() => page(1)} disabled={edge.end} aria-label="Scroll right">
            <ChevronRight size={18} strokeWidth={2.6} />
          </button>
        </div>
      </header>
      <div className={styles.scroller} ref={scroller} onScroll={measure}>
        {children}
      </div>
    </section>
  );
}
