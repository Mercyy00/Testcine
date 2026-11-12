import Link from "next/link";
import { useRouter } from "next/router";
import { Users, Sparkles, ArrowLeft, Shield } from "lucide-react";

export default function AdminNav({ activeTab = "users" }) {
  const router = useRouter();

  const tabs = [
    { id: "users", label: "Users & Roles", href: "/admin/users", Icon: Users },
    { id: "featured", label: "Featured Titles", href: "/admin/featured", Icon: Sparkles },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
        paddingBottom: 20,
        marginBottom: 24,
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "rgba(0, 229, 153, 0.12)",
            border: "1px solid rgba(0, 229, 153, 0.3)",
            display: "grid",
            placeItems: "center",
            color: "var(--primary, #00e599)",
          }}
        >
          <Shield size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
            Admin Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255, 255, 255, 0.55)" }}>
            Control user permissions, moderation, and homepage featured titles
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {tabs.map((tab) => {
          const isActive = router.pathname === tab.href || activeTab === tab.id;
          const { Icon, label, href } = tab;
          return (
            <Link
              key={tab.id}
              href={href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s ease",
                background: isActive ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)",
                color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.65)",
                border: isActive
                  ? "1px solid rgba(255, 255, 255, 0.25)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Icon size={15} style={{ color: isActive ? "var(--primary, #00e599)" : "inherit" }} />
              <span>{label}</span>
            </Link>
          );
        })}

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            color: "rgba(255, 255, 255, 0.5)",
            textDecoration: "none",
            marginLeft: 6,
          }}
          title="Return to site"
        >
          <ArrowLeft size={14} />
          <span>Site</span>
        </Link>
      </div>
    </div>
  );
}
