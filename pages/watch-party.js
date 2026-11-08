import { useState, useRef, useEffect } from "react";
import Layout from "../components/Layout";
import { PageHead, Select } from "../components/Page";
import { Copy, Check, Send } from "lucide-react";
import { getWatchPartyData } from "../lib/data.server";
import { useSettings } from "../lib/store";
import { partyEnabled, joinRoom, newRoomCode, validRoomCode } from "../lib/watchParty";
import styles from "../styles/Party.module.css";

export async function getStaticProps() {
  const data = getWatchPartyData();
  return {
    props: {
      ...data,
    },
    revalidate: 1800,
  };
}

export default function WatchParty({ options = [] }) {
  const [settings] = useSettings();
  const me = settings.name || "Guest";
  const [titleId, setTitleId] = useState(options[0]?.value || "");
  const [room, setRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [people, setPeople] = useState([]);
  const conn = useRef(null);

  const enter = (code, tid) => {
    if (!partyEnabled) return;
    conn.current?.leave();
    const connection = joinRoom(code, me, {
      onChat: (m) => setMsgs((list) => [...list, m]),
      onPresence: setPeople,
    });
    if (!connection) return;
    setMsgs([]);
    setRoom({ code, titleId: tid });
    conn.current = connection;
  };
  const create = () => enter(newRoomCode(), titleId);
  const join = (e) => {
    e.preventDefault();
    const c = joinCode.trim().toUpperCase();
    if (validRoomCode(c)) enter(c, titleId);
  };
  useEffect(() => () => conn.current?.leave(), []);

  const link = room && typeof window !== "undefined" ? `${window.location.origin}/watch/${room.titleId}?room=${room.code}` : "";

  const copyTimerRef = useRef(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      setCopied(true);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 1800);
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const send = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || !conn.current) return;
    setMsgs((m) => [...m, { id: Date.now(), who: me, text: v }]);
    conn.current?.sendChat(v);
    setText("");
  };

  return (
    <Layout title="Watch party" description="Open a room and invite friends to watch together.">
      <div className="pageInner">
        <PageHead title="Watch party" sub="Pick a title, open a room and send the invite link." />
        <div className={styles.grid}>
          <section className={styles.panel}>
            <h2>Start a room</h2>
            <Select id="party-title" label="Title" value={titleId} onChange={setTitleId} options={options} />
            <button type="button" className="btnHero" onClick={create} disabled={!partyEnabled}>
              Open room
            </button>
            <form onSubmit={join} style={{ display: "flex", gap: 8 }}>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Room code" aria-label="Room code" maxLength={5}
                style={{ flex: 1, height: 40, padding: "0 12px", borderRadius: 12, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", textTransform: "uppercase" }} />
              <button type="submit" className="chip" disabled={!partyEnabled}>Join</button>
            </form>
            {!partyEnabled && <p className={styles.hint}>Realtime is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to share rooms.</p>}
            {room && (
              <div className={styles.invite}>
                <small>Room code · {people.length} watching</small>
                <b>{room.code}</b>
                <button type="button" className="chip" onClick={copy}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy invite link"}
                </button>
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <h2>Room chat</h2>
            {room ? (
              <>
                <ul className={styles.log} aria-live="polite">
                  {msgs.map((m) => (
                    <li key={m.id} data-system={m.who === "System" ? "true" : undefined}>
                      <b>{m.who}</b> {m.text}
                    </li>
                  ))}
                </ul>
                <form className={styles.form} onSubmit={send}>
                  <input id="party-msg" value={text} onChange={(e) => setText(e.target.value)} placeholder="Say something" aria-label="Message" autoComplete="off" />
                  <button type="submit" className={styles.send} aria-label="Send">
                    <Send size={18} />
                  </button>
                </form>
              </>
            ) : (
              <p className={styles.hint}>Open or join a room to start chatting.</p>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
