import { useState, useRef, useEffect } from "react";
import Layout from "../components/Layout";
import { PageHead, Select } from "../components/Page";
import { Copy, Check, Send } from "lucide-react";
import { getWatchPartyData } from "../lib/data.server";
import { useSettings } from "../lib/store";
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

const code = () => Math.random().toString(36).slice(2, 7).toUpperCase();

// Local demo: rooms live in this tab. Connect a realtime service (WebSocket, Supabase Realtime) to share them.
export default function WatchParty({ options = [] }) {
  const [settings] = useSettings();
  const me = settings.name || "Guest";
  const [titleId, setTitleId] = useState(options[0]?.value || "");
  const [room, setRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState([]);

  const create = () => {
    setRoom({ code: code(), titleId });
    setMsgs([{ id: 1, who: "System", text: `${me} opened the room.` }]);
  };

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
    if (!v) return;
    setMsgs((m) => [...m, { id: Date.now(), who: me, text: v }]);
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
            <button type="button" className="btnHero" onClick={create}>
              Open room
            </button>
            {room && (
              <div className={styles.invite}>
                <small>Room code</small>
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
              <p className={styles.hint}>Open a room to start chatting. Messages stay in this browser tab until you connect a realtime backend.</p>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
