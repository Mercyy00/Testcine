import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let client = null;

export const partyEnabled = Boolean(url && anon);
const getClient = () => (client ||= createClient(url, anon, { realtime: { params: { eventsPerSecond: 10 } } }));

export const newRoomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};
export const validRoomCode = (c) => /^[A-Z2-9]{5}$/.test(String(c || "").toUpperCase());

// Joins a room. handlers: { onChat, onPlayback, onPresence }. Returns { send, leave }.
export function joinRoom(code, who, handlers = {}) {
  if (!partyEnabled) return null;
  const room = String(code).toUpperCase();
  const me = `${who}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = getClient().channel(`party:${room}`, { config: { broadcast: { self: false }, presence: { key: me } } });
  channel
    .on("broadcast", { event: "chat" }, ({ payload }) => handlers.onChat?.(payload))
    .on("broadcast", { event: "playback" }, ({ payload }) => handlers.onPlayback?.(payload))
    .on("presence", { event: "sync" }, () => handlers.onPresence?.(Object.keys(channel.presenceState()).map((k) => k.replace(/-[^-]+$/, ""))))
    .subscribe((status) => {
      if (status === "SUBSCRIBED") channel.track({ who, at: Date.now() });
    });
  return {
    sendChat: (text) => channel.send({ type: "broadcast", event: "chat", payload: { who, text: String(text).slice(0, 500), id: Date.now() + Math.random() } }),
    sendPlayback: (payload) => channel.send({ type: "broadcast", event: "playback", payload: { ...payload, who } }),
    leave: () => getClient().removeChannel(channel),
  };
}
