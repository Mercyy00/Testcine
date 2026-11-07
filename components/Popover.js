import { useEffect, useRef, useState } from "react";
import styles from "./Popover.module.css";

// Button + dropdown panel that closes on outside click and Escape.
export default function Popover({ trigger, label, children, className = "", panelClass = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const down = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const key = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div className={`${styles.wrap} ${className}`} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {typeof trigger === "function" ? trigger(open) : trigger}
      </button>
      {open && (
        <div
          className={`${styles.panel} ${panelClass}`}
          role="menu"
          onClick={(e) => {
            if (e.target.closest("button[data-close], a, [role='menuitem']")) {
              setOpen(false);
            }
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
