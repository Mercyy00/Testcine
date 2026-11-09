import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BrandCard from "./BrandCard";
import styles from "./TileRow.module.css";

export default function TileRow({ title, items = [], param = "service", className = "" }) {
  const scroller = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft < 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  };

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items]);

  const scroll = (dir) => {
    const el = scroller.current;
    if (!el) return;
    // Scroll by one card width (248px + 16px gap = 264px on desktop, 216px on mobile)
    const card = el.firstElementChild;
    const scrollAmount = card ? card.offsetWidth + 16 : 264;
    el.scrollBy({ left: dir * scrollAmount, behavior: "smooth" });
  };

  return (
    <section className={`${styles.section} ${className}`}>
      <header className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={() => scroll(-1)}
            disabled={edge.start}
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={() => scroll(1)}
            disabled={edge.end}
            aria-label="Scroll right"
          >
            <ChevronRight size={18} strokeWidth={2.6} />
          </button>
        </div>
      </header>

      <div className={styles.scrollerWrap}>
        <div className={styles.scroller} ref={scroller} onScroll={measure}>
          {items.map((it) => (
            <BrandCard key={it.id} item={it} param={param} />
          ))}
        </div>
      </div>
    </section>
  );
}

export { BrandCard };
