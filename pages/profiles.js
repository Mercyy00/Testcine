import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Plus, Pencil, Check, Trash2, X } from "lucide-react";
import { Logo } from "../components/Header";
import { BRAND } from "../lib/data";
import {
  useProfiles,
  useActiveProfileId,
  useSettings,
  switchProfile,
  addProfile,
  updateProfile,
  deleteProfile,
  PROFILE_AVATARS,
} from "../lib/store";
import styles from "../styles/Profiles.module.css";

export default function Profiles() {
  const router = useRouter();
  const [profiles, setProfiles] = useProfiles();
  const [activeProfileId, setActiveProfileId] = useActiveProfileId();
  const [, setSettings] = useSettings();

  const [managing, setManaging] = useState(false);
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [editingProfile, setEditingProfile] = useState(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState("");
  const [formAvatar, setFormAvatar] = useState(PROFILE_AVATARS[0].url);

  const profileList = profiles && profiles.length > 0 ? profiles : [
    {
      id: "guest",
      name: "Guest",
      avatar: "https://image.tmdb.org/t/p/w185/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
      isKids: false,
    },
  ];

  const handleSelectProfile = (p) => {
    if (managing) {
      setEditingProfile(p);
      setFormName(p.name);
      setFormAvatar(p.avatar || PROFILE_AVATARS[0].url);
      setModalMode("edit");
      return;
    }
    switchProfile(setActiveProfileId, setSettings, p);
    router.push("/");
  };

  const openAddModal = () => {
    setFormName("");
    setFormAvatar(PROFILE_AVATARS[0].url);
    setModalMode("add");
  };

  const handleSaveAdd = (e) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) return;
    const created = addProfile(setProfiles, trimmed, formAvatar);
    if (created) {
      switchProfile(setActiveProfileId, setSettings, created);
    }
    setModalMode(null);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingProfile) return;
    const trimmed = formName.trim();
    if (!trimmed) return;
    updateProfile(setProfiles, editingProfile.id, {
      name: trimmed,
      avatar: formAvatar,
    });
    // If active profile was updated, sync settings
    if (activeProfileId === editingProfile.id) {
      setSettings((s) => ({
        ...s,
        name: trimmed,
        avatar: formAvatar,
      }));
    }
    setModalMode(null);
    setEditingProfile(null);
  };

  const handleDeleteProfile = () => {
    if (!editingProfile) return;
    deleteProfile(setProfiles, editingProfile.id);
    if (activeProfileId === editingProfile.id) {
      const remaining = profileList.filter((p) => p.id !== editingProfile.id);
      if (remaining.length > 0) {
        switchProfile(setActiveProfileId, setSettings, remaining[0]);
      }
    }
    setModalMode(null);
    setEditingProfile(null);
  };

  return (
    <>
      <Head>
        <title>Who&apos;s watching? · {BRAND?.name || "Vivarium"}</title>
      </Head>

      <main className={styles.pageWrap}>
        {/* Top brand logo */}
        <div className={styles.topBar}>
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
        </div>

        {/* Central Title */}
        <h1 className={styles.title}>Who&apos;s watching?</h1>

        {/* Profiles Row */}
        <div className={styles.profilesRow}>
          {profileList.map((p) => {
            return (
              <button
                key={p.id}
                type="button"
                className={styles.profileItem}
                onClick={() => handleSelectProfile(p)}
                aria-label={managing ? `Edit ${p.name}` : `Select ${p.name}`}
              >
                <div className={styles.avatarCircle}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.avatar || PROFILE_AVATARS[0].url}
                    alt={p.name}
                    className={styles.avatarImg}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.nextSibling) {
                        e.currentTarget.nextSibling.style.display = "grid";
                      }
                    }}
                  />
                  <div
                    className={styles.avatarFallback}
                    style={{ display: "none" }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Pencil overlay in manage mode */}
                  {managing && (
                    <div className={styles.editOverlay}>
                      <Pencil size={24} />
                    </div>
                  )}
                </div>
                <span className={styles.profileName}>{p.name}</span>
              </button>
            );
          })}

          {/* Add Profile button */}
          <button
            type="button"
            className={styles.profileItem}
            onClick={openAddModal}
            aria-label="Add profile"
          >
            <div className={styles.addCircle}>
              <Plus size={36} strokeWidth={2} />
            </div>
            <span className={styles.profileName}>Add profile</span>
          </button>
        </div>

        {/* Bottom Actions */}
        <div className={styles.bottomRow}>
          <button
            type="button"
            className={`${styles.manageBtn} ${managing ? styles.manageBtnActive : ""}`}
            onClick={() => setManaging((m) => !m)}
          >
            {managing ? (
              <>
                <Check size={16} />
                <span>Done</span>
              </>
            ) : (
              <>
                <Pencil size={15} />
                <span>Manage profiles</span>
              </>
            )}
          </button>

          <Link href="/" className={styles.notNowBtn}>
            Not now
          </Link>
        </div>

        {/* Add Profile Modal */}
        {modalMode === "add" && (
          <div className={styles.modalBackdrop} onClick={() => setModalMode(null)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>Add Profile</h2>
              <form onSubmit={handleSaveAdd}>
                <div className={styles.avatarPicker}>
                  {PROFILE_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      className={`${styles.avatarChoice} ${
                        formAvatar === av.url ? styles.avatarChoiceActive : ""
                      }`}
                      onClick={() => setFormAvatar(av.url)}
                      title={av.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={av.url} alt={av.name} className={styles.avatarChoiceImg} />
                    </button>
                  ))}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="add-name" className={styles.label}>
                    Profile Name
                  </label>
                  <input
                    id="add-name"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Alex, Guest, Kids"
                    className={styles.input}
                    autoFocus
                    maxLength={24}
                    required
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setModalMode(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.saveBtn}
                    disabled={!formName.trim()}
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {modalMode === "edit" && editingProfile && (
          <div className={styles.modalBackdrop} onClick={() => setModalMode(null)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>Edit Profile</h2>
              <form onSubmit={handleSaveEdit}>
                <div className={styles.avatarPicker}>
                  {PROFILE_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      className={`${styles.avatarChoice} ${
                        formAvatar === av.url ? styles.avatarChoiceActive : ""
                      }`}
                      onClick={() => setFormAvatar(av.url)}
                      title={av.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={av.url} alt={av.name} className={styles.avatarChoiceImg} />
                    </button>
                  ))}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="edit-name" className={styles.label}>
                    Profile Name
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Profile name"
                    className={styles.input}
                    autoFocus
                    maxLength={24}
                    required
                  />
                </div>

                <div className={styles.modalActions}>
                  {profileList.length > 1 && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={handleDeleteProfile}
                      title="Delete this profile"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setModalMode(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.saveBtn}
                    disabled={!formName.trim()}
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
