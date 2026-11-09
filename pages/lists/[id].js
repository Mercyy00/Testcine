import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import { TitleGrid, Empty } from "../../components/Page";
import { SkeletonGrid } from "../../components/Skeleton";
import { useCustomLists } from "../../lib/store";
import { useToast } from "../../lib/useToast";
import { ChevronLeft, Share2, Folder, User } from "lucide-react";
import styles from "../../styles/Lists.module.css";

export default function CustomListPage() {
  const router = useRouter();
  const { id } = router.query;
  const [customLists] = useCustomLists();
  const [listData, setListData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, showToast] = useToast(2500);

  useEffect(() => {
    if (!router.isReady || !id) return;

    let active = true;
    setLoading(true);

    // 1. Try to fetch from server API
    fetch(`/api/user/list?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (data) {
          setListData(data);
          setLoading(false);
        } else {
          // 2. Fallback to local custom lists in client store
          const local = (customLists || []).find((l) => l.id === id);
          if (local) {
            setListData({
              id: local.id,
              name: local.name,
              items: (local.items || []).map((tId) => (typeof tId === "object" ? tId : { id: tId })),
              user: { name: "You" },
            });
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!active) return;
        const local = (customLists || []).find((l) => l.id === id);
        if (local) {
          setListData({
            id: local.id,
            name: local.name,
            items: (local.items || []).map((tId) => (typeof tId === "object" ? tId : { id: tId })),
            user: { name: "You" },
          });
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router.isReady, id, customLists]);

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast("List link copied to clipboard");
    }
  };

  return (
    <Layout
      title={listData ? listData.name : "Custom List"}
      description={listData?.description || "Curated list on DIVINE."}
    >
      <div className="pageInner" style={{ padding: "40px var(--page-pad) 80px", maxWidth: "var(--page-max)", margin: "0 auto" }}>
        {/* Back navigation */}
        <Link
          href="/lists"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(255,255,255,0.7)",
            fontSize: 14,
            marginBottom: 24,
            textDecoration: "none",
          }}
        >
          <ChevronLeft size={16} />
          <span>All lists</span>
        </Link>

        {loading ? (
          <SkeletonGrid count={8} wide={true} />
        ) : listData ? (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 32,
                paddingBottom: 20,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div>
                <h1 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
                  {listData.name}
                </h1>
                {listData.description && (
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, margin: "8px 0 0", maxWidth: 600 }}>
                    {listData.description}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <User size={14} />
                    <span>Created by {listData.user?.name || "Community member"}</span>
                  </span>
                  <span>·</span>
                  <span>{(listData.items || []).length} {listData.items?.length === 1 ? "title" : "titles"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleShare}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "var(--surface-2, #14171d)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Share2 size={15} />
                <span>Share list</span>
              </button>
            </div>

            {listData.items && listData.items.length > 0 ? (
              <TitleGrid items={listData.items} wide={true} />
            ) : (
              <Empty
                title="This list is empty"
                text="The creator hasn't added any titles to this list yet."
                href="/discover"
                cta="Discover titles"
              />
            )}
          </div>
        ) : (
          <Empty
            title="List not found"
            text="The requested list could not be found or has been removed."
            href="/lists"
            cta="Back to My list"
          />
        )}
      </div>

      {toast && <div className={styles.cardToast}>{toast}</div>}
    </Layout>
  );
}
