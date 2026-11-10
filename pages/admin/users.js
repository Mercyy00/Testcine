import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import LoadingScreen from "../../components/LoadingScreen";
import { useToast } from "../../lib/useToast";
import { Shield, ShieldAlert, UserX, UserCheck, ShieldCheck, ArrowLeft, Search } from "lucide-react";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, showToast] = useToast(2500);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchUsers();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [status, session]);

  const handleToggleRole = async (user) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-role", userId: user.id }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(`Role updated to ${d.role}`);
        fetchUsers();
      } else {
        showToast(d.error || "Failed to update role");
      }
    } catch {
      showToast("Network error updating role");
    }
  };

  const handleToggleBan = async (user) => {
    const isBanned = Boolean(user.bannedAt);
    const action = isBanned ? "unban" : "ban";
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: user.id }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(isBanned ? `Unbanned @${user.username || user.name}` : `Banned @${user.username || user.name}`);
        fetchUsers();
      } else {
        showToast(d.error || "Failed to update ban status");
      }
    } catch {
      showToast("Network error");
    }
  };

  if (status === "loading" || loading) {
    return (
      <Layout title="Admin · Users">
        <LoadingScreen minHeight="60vh" message="Loading administration dashboard…" />
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

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  return (
    <Layout title="Admin · User Management">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px var(--page-pad) 80px" }}>
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Shield size={24} color="var(--primary, #00e599)" />
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>User Administration</h1>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: "6px 0 0" }}>
              Manage accounts, roles, and access controls across the platform.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
              <input
                type="text"
                placeholder="Search user, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: "var(--surface-2, #14171d)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "8px 14px 8px 34px",
                  fontSize: 13,
                  color: "#fff",
                  outline: "none",
                  width: 220,
                }}
              />
            </div>
          </div>
        </div>

        {/* User Table */}
        <div
          style={{
            background: "var(--surface-1, #0f1115)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.6)" }}>
                  <th style={{ padding: "14px 18px", fontWeight: 600 }}>User</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600 }}>Email</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600 }}>Role</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600 }}>Joined</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => {
                    const isBanned = Boolean(u.bannedAt);
                    const isAdmin = u.role === "ADMIN";
                    const isSelf = u.id === session.user.id;
                    const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          opacity: isBanned ? 0.6 : 1,
                        }}
                      >
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: "var(--surface-3, #222)",
                                overflow: "hidden",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 700,
                                fontSize: 13,
                              }}
                            >
                              {u.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={u.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                (u.name || u.username || "U").charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "#fff" }}>{u.name || "Unnamed"}</div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>@{u.username || "user"}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 18px", color: "rgba(255,255,255,0.7)" }}>
                          {u.email || "—"}
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isAdmin ? "rgba(0, 229, 153, 0.15)" : "rgba(255,255,255,0.06)",
                              color: isAdmin ? "var(--primary, #00e599)" : "rgba(255,255,255,0.8)",
                            }}
                          >
                            {isAdmin && <ShieldCheck size={12} />}
                            {u.role}
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px", color: "rgba(255,255,255,0.5)" }}>
                          {dateStr}
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isBanned ? "rgba(229, 62, 62, 0.15)" : "rgba(72, 187, 120, 0.15)",
                              color: isBanned ? "#fc8181" : "#68d391",
                            }}
                          >
                            {isBanned ? "Banned" : "Active"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleToggleRole(u)}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: "var(--surface-2, #1a1d24)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  color: "#fff",
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                              >
                                {isAdmin ? "Demote" : "Make Admin"}
                              </button>
                            )}

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleToggleBan(u)}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: isBanned ? "rgba(72, 187, 120, 0.12)" : "rgba(229, 62, 62, 0.12)",
                                  border: "1px solid " + (isBanned ? "rgba(72, 187, 120, 0.3)" : "rgba(229, 62, 62, 0.3)"),
                                  color: isBanned ? "#68d391" : "#fc8181",
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                              >
                                {isBanned ? "Unban" : "Ban"}
                              </button>
                            )}

                            {isSelf && (
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
                                (Your account)
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px 18px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                      No users match your search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1a1d24", color: "#fff", padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", fontSize: 13, zIndex: 9999 }}>{toast}</div>}
    </Layout>
  );
}
