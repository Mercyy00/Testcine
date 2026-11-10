import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, Shuffle, Check, X } from "lucide-react";
import MediaCard from "./MediaCard";
import styles from "./Page.module.css";

const PLURAL_MAP = {
  country: "All Countries",
  category: "All Categories",
  rating: "All Ratings",
  service: "All Services",
  genre: "All Genres",
  year: "All Years",
  language: "All Languages",
};

export function FilterDropdown({
  filterKey,
  options = [],
  value = "all",
  onChange,
  isOpen,
  onToggle,
  onClose,
}) {
  const containerRef = useRef(null);
  const [alignRight, setAlignRight] = useState(false);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Adjust menu alignment so it never overflows off-screen on the right
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const overflowRight = rect.left + 230 > window.innerWidth;
      setAlignRight(overflowRight);
    }
  }, [isOpen]);

  const isSelected = Boolean(value && value !== "all");
  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const defaultLabel = filterKey.charAt(0).toUpperCase() + filterKey.slice(1);
  const displayLabel = isSelected && selectedOption ? selectedOption.label : defaultLabel;
  const allOptionLabel = PLURAL_MAP[filterKey.toLowerCase()] || `All ${defaultLabel}s`;

  return (
    <div
      ref={containerRef}
      className={`${styles.dropdownWrapper} ${isOpen ? styles.dropdownWrapperOpen : ""}`}
    >
      <button
        type="button"
        className={`${styles.dropdownTrigger} ${
          isSelected ? styles.dropdownTriggerActive : ""
        } ${isOpen ? styles.dropdownTriggerOpen : ""}`}
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${defaultLabel} filter`}
      >
        {isSelected && <span className={styles.activeDot} />}
        <span className={styles.dropdownLabel} title={displayLabel}>
          {displayLabel}
        </span>
        {isSelected ? (
          <span
            role="button"
            tabIndex={0}
            className={styles.dropdownClearBtn}
            onClick={(e) => {
              e.stopPropagation();
              onChange(filterKey, "all");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onChange(filterKey, "all");
              }
            }}
            title={`Clear ${defaultLabel}`}
            aria-label={`Clear ${defaultLabel}`}
          >
            <X size={11} strokeWidth={2.5} />
          </span>
        ) : null}
        <ChevronDown
          size={13}
          strokeWidth={2.2}
          className={`${styles.dropdownChevron} ${
            isOpen ? styles.dropdownChevronOpen : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`${styles.dropdownMenu} ${
            alignRight ? styles.dropdownMenuRight : ""
          }`}
          role="listbox"
          aria-label={defaultLabel}
        >
          {/* Reset / All Option */}
          <button
            type="button"
            role="option"
            aria-selected={!isSelected}
            className={`${styles.dropdownItem} ${
              !isSelected ? styles.dropdownItemActive : ""
            }`}
            onClick={() => {
              onChange(filterKey, "all");
              onClose();
            }}
          >
            <span className={styles.dropdownItemLabel}>{allOptionLabel}</span>
            {!isSelected && <Check size={14} strokeWidth={2.2} className={styles.dropdownItemCheck} />}
          </button>

          <div className={styles.dropdownDivider} />

          {/* Options List */}
          <div className={styles.dropdownScrollArea}>
            {options.map((opt) => {
              const active = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`${styles.dropdownItem} ${
                    active ? styles.dropdownItemActive : ""
                  }`}
                  onClick={() => {
                    onChange(filterKey, opt.value);
                    onClose();
                  }}
                >
                  <span className={styles.dropdownItemLabel}>{opt.label}</span>
                  {active && (
                    <Check
                      size={14}
                      strokeWidth={2.2}
                      className={styles.dropdownItemCheck}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function CatalogFilterBar({
  title,
  category,
  onCategoryChange,
  categories = [],
  filters = {},
  onFilterChange,
  filterOptions = {},
  onShuffle,
}) {
  const [openFilterKey, setOpenFilterKey] = useState(null);

  return (
    <div className={styles.catalogHeader}>
      <h1 className={styles.catalogTitle}>{title}</h1>
      <div className={styles.filterBar}>
        {/* Left Category Pills */}
        <div className={styles.filterLeftPills}>
          {categories.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`${styles.categoryPill} ${
                category === c.value ? styles.categoryPillActive : ""
              }`}
              onClick={() => onCategoryChange(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Right Glass Dropdowns */}
        <div className={styles.filterRightSelects}>
          {Object.entries(filterOptions).map(([key, options]) => (
            <FilterDropdown
              key={key}
              filterKey={key}
              options={options}
              value={filters[key] || "all"}
              onChange={onFilterChange}
              isOpen={openFilterKey === key}
              onToggle={() =>
                setOpenFilterKey((prev) => (prev === key ? null : key))
              }
              onClose={() => setOpenFilterKey(null)}
            />
          ))}

          {onShuffle && (
            <button
              type="button"
              onClick={onShuffle}
              className={styles.shuffleBtn}
              title="Shuffle / Randomize"
              aria-label="Shuffle titles"
            >
              <Shuffle size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <div className={styles.head}>
      <div>
        <h1 className="pageTitle">{title}</h1>
        {sub && <p className={styles.sub}>{sub}</p>}
      </div>
      {children && <div className={styles.headTools}>{children}</div>}
    </div>
  );
}

export function Grid({ children, wide }) {
  return <div className={`${styles.grid} ${wide ? styles.gridWide : ""}`}>{children}</div>;
}

export function TitleGrid({ items, wide, cardProps }) {
  return (
    <Grid wide={wide}>
      {items.map((t) => (
        <MediaCard key={t.id} title={t} fluid wide={wide} {...(cardProps ? cardProps(t) : {})} />
      ))}
    </Grid>
  );
}

export function Empty({ title, text, href, cta }) {
  return (
    <div className={styles.empty}>
      <h2>{title}</h2>
      <p>{text}</p>
      {href && (
        <Link href={href} className="btnHero">
          {cta}
        </Link>
      )}
    </div>
  );
}

export function Chips({ options, value, onChange, label }) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`${styles.chip} ${o.value === value ? styles.chipOn : ""}`}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select({ id, label, value, onChange, options }) {
  return (
    <label className={styles.select} htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
