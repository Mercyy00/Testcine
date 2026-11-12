import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BrandCard from "./BrandCard";
import styles from "./TileRow.module.css";

export default function TileRow({ title, items = [], param = "service", className = "" }) {
  const scroller = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const hasMoved = useRef(false);

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

  const scroll = (dir) => {
    const el = scroller.current;
    if (!el) return;
    // Step exactly 3 cards on arrow click
    const card = el.firstElementChild;
    const scrollAmount = card ? (card.offsetWidth + 16) * 3 : 264 * 3;
    el.scrollBy({ left: dir * scrollAmount, behavior: "smooth" });
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
        <div
          className={styles.scroller}
          ref={scroller}
          onScroll={measure}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onClickCapture={onClickCapture}
        >
          {items.map((it) => (
            <BrandCard key={it.id} item={it} param={param} />
          ))}
        </div>
      </div>
    </section>
  );
}

export { BrandCard };
