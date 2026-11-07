import Link from "next/link";
import { ChevronDown, Shuffle } from "lucide-react";
import MediaCard from "./MediaCard";
import styles from "./Page.module.css";

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
  return (
    <div className={styles.catalogHeader}>
      <h1 className={styles.catalogTitle}>{title}</h1>
      <div className={styles.filterBar}>
        {/* Left Pills */}
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

        {/* Right Select Dropdowns */}
        <div className={styles.filterRightSelects}>
          {Object.entries(filterOptions).map(([key, options]) => (
            <div key={key} className={styles.dropdownPill}>
              <select
                value={filters[key] || "all"}
                onChange={(e) => onFilterChange(key, e.target.value)}
                className={styles.dropdownSelect}
                aria-label={key}
              >
                <option value="all">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className={styles.dropdownArrow} />
            </div>
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
