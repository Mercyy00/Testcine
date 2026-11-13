import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
import styles from "./MediaRow.module.css";

// Section wrapper with a heading, an optional filter chip and a snapping scroller.
export default function MediaRow({ title, href, menu, menus, tabs, pager, children, className = "" }) {
  const scroller = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [openMenu, setOpenMenu] = useState(null);
  const menuRefs = useRef([]);
  const rowMenus = Array.isArray(menus) ? menus : menu ? [menu] : [];

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const hasMoved = useRef(false);

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
    if (openMenu === null) return;
    const close = (e) => {
      if (!menuRefs.current.some((element) => element?.contains(e.target))) setOpenMenu(null);
    };
    const esc = (e) => e.key === "Escape" && setOpenMenu(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [openMenu]);

  // Window mouseup listener to terminate drag anywhere
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (isDragging.current) {
        stopDragging();
      }
    };
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => {
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, []);

  // Step exactly 3 cards on arrow click
  const page = (dir) => {
    const el = scroller.current;
    if (!el) return;
    const firstCard = el.firstElementChild;
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 280;
    const gap = 16;
    const step = (cardWidth + gap) * 3;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    const el = scroller.current;
    if (!el) return;
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
    el.style.scrollBehavior = "auto";
    el.style.scrollSnapType = "none";
  };

  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    const el = scroller.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startX.current;
    if (Math.abs(walk) > 5) {
      hasMoved.current = true;
      el.style.userSelect = "none";
      el.style.cursor = "grabbing";
    }
    el.scrollLeft = scrollLeftStart.current - walk;
  };

  const stopDragging = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const el = scroller.current;
    if (el) {
      el.style.scrollBehavior = "smooth";
      el.style.scrollSnapType = "";
      el.style.userSelect = "";
      el.style.cursor = "";
    }
  };

  const onClickCapture = (e) => {
    if (hasMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      hasMoved.current = false;
    }
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
        {rowMenus.map((menu, index) => (
          <div className={styles.menuWrap} key={index} ref={(element) => { menuRefs.current[index] = element; }}>
            <button
              type="button"
              className={`${styles.menuTrigger} chip`}
              aria-haspopup="listbox"
              aria-expanded={openMenu === index}
              onClick={() => setOpenMenu((current) => current === index ? null : index)}
            >
              {menu.label || menu.options.find((o) => o.value === menu.value)?.label}
              <ChevronDown size={16} strokeWidth={2.6} />
            </button>
            {openMenu === index && (
              <ul className={styles.menu} role="listbox">
                {menu.options.map((o) => (
                  <li key={o.value} role="option" aria-selected={o.value === menu.value}>
                    <button
                      type="button"
                      onClick={() => {
                        menu.onChange(o.value);
                        setOpenMenu(null);
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
        ))}
        {tabs?.length > 0 && (
          <div className={styles.tabs} role="tablist" aria-label={`${title} sort`}>
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={tab.selected}
                className={tab.selected ? styles.activeTab : ""}
                onClick={tab.onClick}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {pager ? (
          <div className={styles.arrows}>
            <button type="button" onClick={pager.previous} disabled={pager.page <= 1 || pager.loading} aria-label="Previous page">
              <ChevronLeft size={18} strokeWidth={2.6} />
            </button>
            <button type="button" onClick={pager.next} disabled={!pager.hasMore || pager.loading} aria-label="Next page">
              <ChevronRight size={18} strokeWidth={2.6} />
            </button>
          </div>
        ) : (
          <div className={styles.arrows}>
            <button type="button" onClick={() => page(-1)} disabled={edge.start} aria-label="Scroll left">
              <ChevronLeft size={18} strokeWidth={2.6} />
            </button>
            <button type="button" onClick={() => page(1)} disabled={edge.end} aria-label="Scroll right">
              <ChevronRight size={18} strokeWidth={2.6} />
            </button>
          </div>
        )}
      </header>
      <div
        className={styles.scroller}
        ref={scroller}
        onScroll={measure}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </section>
  );
}
