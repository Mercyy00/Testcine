import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import LoadingScreen from "../../components/LoadingScreen";
import AdminNav from "../../components/AdminNav";
import { useToast } from "../../lib/useToast";
import {
  Sparkles,
  ShieldAlert,
  Plus,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Search,
  ExternalLink,
} from "lucide-react";

export default function AdminFeaturedPage() {
  const { data: session, status } = useSession();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, showToast] = useToast(2500);

  // Search to add new featured title
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchFeatured = async () => {
    try {
      const res = await fetch("/api/admin/featured");
      if (res.ok) {
        const data = await res.json();
        setFeatured(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchFeatured();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [status, session]);

  // Live search for adding title
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data.slice(0, 8) : []);
        }
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddTitle = async (title) => {
    try {
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          titleId: title.id,
          titleData: {
            id: title.id,
            title: title.title || title.name,
            poster: title.poster,
            backdrop: title.backdrop,
            synopsis: title.synopsis || title.overview,
            year: title.year,
            rating: title.rating,
            type: title.type || "movie",
          },
        }),
      });
      if (res.ok) {
        showToast(`Added "${title.title || title.name}" to featured`);
        setShowAddModal(false);
        setSearchQuery("");
        setSearchResults([]);
        fetchFeatured();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to add featured title");
      }
    } catch {
      showToast("Network error adding featured title");
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-active", id: item.id }),
      });
      if (res.ok) {
        const updated = await res.json();
        showToast(updated.active ? "Title visible on Hero Banner" : "Title hidden from Hero Banner");
        fetchFeatured();
      }
    } catch {
      showToast("Error toggling active state");
    }
  };

  const handleDelete = async (item) => {
    try {
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: item.id }),
      });
      if (res.ok) {
        showToast("Removed from featured titles");
        fetchFeatured();
      }
    } catch {
      showToast("Error deleting title");
    }
  };

  if (status === "loading" || loading) {
    return (
      <Layout title="Admin · Featured Titles">
        <LoadingScreen minHeight="60vh" message="Loading admin dashboard…" />
      </Layout>
    );
  }

  if (status !== "authenticated" || session?.user?.role !== "ADMIN") {
    return (
      <Layout title="Access Denied">
        <div style={{ maxWidth: 440, margin: "100px auto", textAlign: "center", padding: "0 20px" }}>
          <ShieldAlert size={48} color="#e53e3e" style={{ margin: "0 auto 16px" }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 10px" }}>Administrator Access Required</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: "0 0 24px" }}>
            This page is restricted to DIVINE system administrators.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              padding: "10px 20px",
              borderRadius: 8,
              background: "var(--primary, #00e599)",
              color: "#000",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Return Home
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin · Featured Titles">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px var(--page-pad) 80px" }}>
        <AdminNav activeTab="featured" />

        {/* Action Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              Hero Banner Titles ({featured.length})
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              Customize and order the titles displayed in the homepage hero carousel
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              borderRadius: 8,
              background: "var(--primary, #00e599)",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Featured Title</span>
          </button>
        </div>

        {/* Featured Items List */}
        {featured.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.12)",
              borderRadius: 14,
            }}
          >
            <Sparkles size={36} style={{ color: "rgba(255,255,255,0.3)", margin: "0 auto 12px" }} />
            <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600 }}>
              No custom featured titles set
            </p>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: 13, maxWidth: 420, marginInline: "auto" }}>
              The homepage is currently displaying automated trending titles. Click "Add Featured Title" to pin custom selections.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {featured.map((item, index) => {
              const data = item.titleData || {};
              const titleName = data.title || data.name || item.titleId;
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "12px 18px",
                    background: "var(--surface-1, #0f1115)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        color: "rgba(255,255,255,0.4)",
                        width: 20,
                        textAlign: "center",
                      }}
                    >
                      #{index + 1}
                    </span>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.poster || data.backdrop || "/logo.png"}
                      alt=""
                      style={{
                        width: 44,
                        height: 62,
                        borderRadius: 6,
                        objectFit: "cover",
                        background: "#111",
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <b style={{ fontSize: 15, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {titleName}
                        </b>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.65)",
                            textTransform: "uppercase",
                          }}
                        >
                          {data.type || "title"}
                        </span>
                      </div>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                        {data.year && <span>{data.year} · </span>}
                        {data.rating && <span>★ {data.rating} · </span>}
                        <span>ID: {item.titleId}</span>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: item.active ? "rgba(74, 222, 128, 0.12)" : "rgba(255,255,255,0.04)",
                        color: item.active ? "#4ade80" : "rgba(255,255,255,0.5)",
                        cursor: "pointer",
                      }}
                      title={item.active ? "Currently displayed on banner" : "Hidden from banner"}
                    >
                      {item.active ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{item.active ? "Active" : "Hidden"}</span>
                    </button>

                    <Link
                      href={`/title/${item.titleId}`}
                      target="_blank"
                      style={{
                        padding: "6px 8px",
                        color: "rgba(255,255,255,0.5)",
                        display: "grid",
                        placeItems: "center",
                      }}
                      title="View title page"
                    >
                      <ExternalLink size={14} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      style={{
                        padding: "6px 8px",
                        color: "#f87171",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                      }}
                      title="Delete from featured"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Search & Add Featured Title */}
        {showAddModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(8px)",
              display: "grid",
              placeItems: "center",
              zIndex: 99999,
              padding: 20,
            }}
            onClick={() => setShowAddModal(false)}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                background: "#14171d",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Featured Title</h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 18 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ position: "relative", marginBottom: 16 }}>
                <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
                <input
                  type="text"
                  placeholder="Search TMDB for a movie, series, or anime…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 38px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              {searching && (
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "20px 0" }}>
                  Searching TMDB…
                </p>
              )}

              <div style={{ maxHeight: 320, overflowY: "auto", display: "grid", gap: 8 }}>
                {searchResults.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.poster || t.backdrop || "/logo.png"}
                        alt=""
                        style={{ width: 32, height: 46, borderRadius: 4, objectFit: "cover" }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <b style={{ fontSize: 13, color: "#fff", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.title || t.name}
                        </b>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                          {t.year || t.releaseDate?.slice(0, 4)} · {t.type}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddTitle(t)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: "var(--primary, #00e599)",
                        color: "#000",
                        fontSize: 12,
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      Pin Title
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              background: "#1a1d24",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              fontSize: 13,
              zIndex: 99999,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </Layout>
  );
}
