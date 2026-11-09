import React from "react";
import Link from "next/link";
import styles from "./LiquidGlassButton.module.css";

/**
 * Default chevron SVG from the prompt's reference design
 */
function DefaultChevron() {
  return (
    <svg
      className={styles.svg}
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M779.180132 473.232045 322.354755 16.406668c-21.413706-21.413706-56.121182-21.413706-77.534887 0-21.413706 21.413706-21.413706 56.122205 0 77.534887l418.057421 418.057421L244.819868 930.057421c-21.413706 21.413706-21.413706 56.122205 0 77.534887 10.706853 10.706853 24.759917 16.059767 38.767955 16.059767s28.061103-5.353938 38.767955-16.059767L779.180132 550.767955C800.593837 529.35425 800.593837 494.64575 779.180132 473.232045z" />
    </svg>
  );
}

/**
 * LiquidGlassButton - High-end optical liquid-glass button component.
 *
 * @param {Object} props
 * @param {string} [props.text="Get started"] - Label inside the button
 * @param {string} [props.href] - If provided, renders an accessible Next.js Link
 * @param {Function} [props.onClick] - Click handler
 * @param {React.ReactNode} [props.icon] - Icon inside the trailing circular button-in-button
 * @param {"glass"|"primary"|"accent"} [props.variant="glass"] - Visual variant
 * @param {"sm"|"md"|"lg"} [props.size="md"] - Size preset
 * @param {string} [props.width] - Optional CSS width override (e.g. "260px")
 * @param {string} [props.height] - Optional CSS height override (e.g. "75px")
 * @param {string} [props.className] - Additional classes
 * @param {Object} [props.style] - Additional inline styles
 * @param {string} [props.ariaLabel] - Accessibility label
 * @param {string} [props.type="button"] - HTML button type
 */
export default function LiquidGlassButton({
  text = "Get started",
  href,
  onClick,
  icon,
  variant = "glass",
  size = "md",
  width,
  height,
  className = "",
  style = {},
  ariaLabel,
  type = "button",
  children,
}) {
  const customVars = {
    ...(width ? { "--w": width } : {}),
    ...(height ? { "--h": height } : {}),
    ...style,
  };

  const variantClass = styles[`variant_${variant}`] || styles.variant_glass;
  const sizeClass = styles[`size_${size}`] || styles.size_md;

  const content = (
    <div
      className={`${styles.box} ${styles.startBtn} ${variantClass} ${sizeClass} ${className}`}
      style={customVars}
    >
      <span className={styles.text}>{children || text}</span>
      <div className={styles.btnIcon}>
        {icon !== undefined ? icon : <DefaultChevron />}
      </div>
      <div className={styles.circleOverlay} aria-hidden="true" />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={styles.linkWrapper}
        onClick={onClick}
        aria-label={ariaLabel || (typeof text === "string" ? text : "Get started")}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={styles.buttonWrapper}
      aria-label={ariaLabel || (typeof text === "string" ? text : "Get started")}
    >
      {content}
    </button>
  );
}
