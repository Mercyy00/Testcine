import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import useVideoPlayback from "./useVideoPlayback";
import { joinRoom } from "../lib/watchParty";
import { useSettings } from "../lib/store";
import styles from "../styles/Watch.module.css";

export const formatTime = (seconds) => {
  const time = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  return `${hours ? `${hours}:${String(minutes).padStart(2, "0")}` : minutes}:${String(time % 60).padStart(2, "0")}`;
};

export default function VideoPlayer({ servers, defaultServer, title, initialProgress, onProgress, nextEpisode, onNext, room, partyName = "Guest", children }) {
  const stageRef = useRef(null);
  const hideTimer = useRef(null);
  const attempts = useRef(new Set());
  const [activeId, setActiveId] = useState(defaultServer);
  const [failedServers, setFailedServers] = useState([]);
  const [retry, setRetry] = useState(0);
  const [chrome, setChrome] = useState(true);
  const [switchNotice, setSwitchNotice] = useState("");
  const activeServer = servers.find((server) => server.id === activeId);
  const player = useVideoPlayback({ streamUrl: activeServer?.url, retry, initialProgress, onProgress,
    onFailure: () => {
      attempts.current.add(activeId);
      setFailedServers([...attempts.current]);
      const next = servers.find((server) => server.status === "online" && !attempts.current.has(server.id));
      if (next) {
        setSwitchNotice(`${activeServer.name} is unavailable. Switched to ${next.name}.`);
        setActiveId(next.id);
      }
      return Boolean(next);
    } });
  const wake = () => {
    setChrome(true);
    clearTimeout(hideTimer.current);
    if (player.playing) hideTimer.current = setTimeout(() => setChrome(false), 2600);
  };
  useEffect(() => {
    setChrome(true);
    if (player.playing) hideTimer.current = setTimeout(() => setChrome(false), 2600);
    return () => clearTimeout(hideTimer.current);
  }, [player.playing]);
  // Note: setChrome(true) here is an intentional sync to player.playing state change;
  // the warning is from the React 19 strict rules. In practice this causes no cascading
  // render because it's idempotent and only fires when player.playing transitions.
  const [settings] = useSettings();
  const isSeries = title.type !== "movie";
  const showSkipIntro = isSeries && player.ready && player.currentTime >= 15 && player.currentTime < 90;
  const nearEnd = Boolean(nextEpisode) && player.duration > 0 && player.currentTime / player.duration >= 0.95;
  const [countdown, setCountdown] = useState(10);
  const [nextCancelled, setNextCancelled] = useState(false);
  useEffect(() => {
    if (!nearEnd || nextCancelled) { setCountdown(10); return; }
    if (countdown <= 0) { onNext?.(); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [nearEnd, nextCancelled, countdown, onNext]);

  // Watch party: broadcast local play/pause/seek, apply remote ones.
  useEffect(() => {
    const video = player.videoRef.current;
    if (!room || !video) return;
    let applying = false;
    const conn = joinRoom(room, partyName, {
      onPlayback: ({ type, time }) => {
        applying = true;
        if (Number.isFinite(time) && Math.abs(video.currentTime - time) > 1.5) video.currentTime = time;
        if (type === "play") video.play().catch(() => {});
        if (type === "pause") video.pause();
        setTimeout(() => { applying = false; }, 400);
      },
    });
    if (!conn) return;
    const send = (type) => () => { if (!applying) conn.sendPlayback({ type, time: video.currentTime }); };
    const onPlay = send("play"), onPause = send("pause"), onSeek = send("seek");
    video.addEventListener("play", onPlay); video.addEventListener("pause", onPause); video.addEventListener("seeked", onSeek);
    return () => {
      video.removeEventListener("play", onPlay); video.removeEventListener("pause", onPause); video.removeEventListener("seeked", onSeek);
      conn.leave();
    };
  }, [room, partyName, player.videoRef]);
  const skipSec = parseInt(settings.skipInterval || "10", 10) || 10;

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stageRef.current.requestFullscreen) await stageRef.current.requestFullscreen();
      else player.videoRef.current.webkitEnterFullscreen?.();
    } catch { setSwitchNotice("Fullscreen is unavailable in this browser."); }
  };

  useEffect(() => {
    const handleKey = (e) => {
      const tag = (e.target?.tagName || document.activeElement?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        player.seek(Math.max(0, player.currentTime - skipSec));
        wake();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        player.seek(Math.min(player.duration || 0, player.currentTime + skipSec));
        wake();
      } else if (e.key === " " || e.key === "k") {
        e.preventDefault();
        player.togglePlay();
        wake();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        fullscreen();
        wake();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        player.toggleMute();
        wake();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        player.changeVolume(Math.min(1, Math.round((player.volume + 0.1) * 10) / 10));
        wake();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        player.changeVolume(Math.max(0, Math.round((player.volume - 0.1) * 10) / 10));
        wake();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [player, skipSec]);
  const retryPlayback = () => {
    attempts.current.clear();
    setFailedServers([]);
    setSwitchNotice("");
    setActiveId(defaultServer);
    setRetry((value) => value + 1);
  };

  return (
    <div ref={stageRef} className={styles.stage} onPointerMove={wake} onPointerDown={wake} onFocus={wake}>
      <video ref={player.videoRef} className={styles.video} playsInline preload="metadata"
        poster={title.backdrop || title.poster} aria-label={`${title.title} video`} onClick={player.togglePlay} />
      <div className={styles.vignette} />
      <div className={`${styles.top} ${chrome ? "" : styles.hidden}`}>{children}</div>
      {player.ready && !player.playing && !player.error && (
        <button type="button" className={styles.center} onClick={player.togglePlay} aria-label="Play">
          <span className={styles.bigPlay}><Play size={34} fill="currentColor" /></span>
        </button>
      )}
      {player.error ? (
        <div className={styles.status} role="alert">
          <p>{player.error}</p>
          <button type="button" className="chip" onClick={retryPlayback}>Retry playback</button>
        </div>
      ) : player.buffering && (
        <div className={styles.status} role="status"><p>{player.ready ? "Buffering…" : "Loading stream…"}</p></div>
      )}
      {showSkipIntro && !nearEnd && (
        <button type="button" className={styles.skipBtn} onClick={() => player.seek(Math.min(player.duration || Infinity, player.currentTime + 85))}>Skip intro</button>
      )}
      {nearEnd && !nextCancelled && (
        <div className={styles.nextCard} role="status">
          <span>Next episode in {countdown}s</span>
          <button type="button" className={styles.skipBtn} onClick={() => onNext?.()}>Play now</button>
          <button type="button" className={styles.skipBtn} onClick={() => setNextCancelled(true)}>Cancel</button>
        </div>
      )}
      <div className={`${styles.bar} ${chrome ? "" : styles.hidden}`}>
        <p className={styles.playerNotice} role="status">{player.notice || switchNotice}</p>
        <input className={styles.seek} type="range" min={0} max={player.duration || 0} step="0.1"
          value={Math.min(player.currentTime, player.duration || 0)} disabled={!player.ready} aria-label="Seek time"
          aria-valuetext={`${formatTime(player.currentTime)} of ${formatTime(player.duration)}`}
          style={{ "--p": `${player.duration ? player.currentTime / player.duration * 100 : 0}%` }}
          onChange={(event) => player.seek(Number(event.target.value))} />
        <div className={styles.controls}>
          <div className={styles.controlsLeft}>
            <button type="button" className={styles.btn} onClick={player.togglePlay} disabled={!player.ready}
              aria-label={player.playing ? "Pause" : "Play"}>
              {player.playing ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
            </button>
            <span className={styles.time}>{formatTime(player.currentTime)} / {formatTime(player.duration)}</span>
          </div>
          <div className={styles.controlsRight}>
            <button type="button" className={styles.btn} onClick={player.toggleMute} aria-label={player.muted ? "Unmute" : "Mute"}>
              {player.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input className={styles.volume} type="range" min="0" max="1" step="0.05" aria-label="Volume"
              value={player.muted ? 0 : player.volume} onChange={(event) => player.changeVolume(Number(event.target.value))} />
            <label className={styles.selectLabel}>
              <span>Quality</span>
              <select aria-label="Quality" className={styles.select} value={player.quality}
                disabled={!player.qualities.length} onChange={(event) => player.chooseQuality(Number(event.target.value))}>
                <option value={-1}>{player.qualities.length ? `Auto${player.currentHeight ? ` (${player.currentHeight}p)` : ""}` : "Auto (browser)"}</option>
                {player.qualities.map((height) => <option key={height} value={height}>{height}p</option>)}
              </select>
            </label>
            <label className={styles.selectLabel}>
              <span>Server</span>
              <select aria-label="Server" className={styles.select} value={activeId || ""}
                onChange={(event) => { setActiveId(event.target.value); setSwitchNotice(""); }}>
                {servers.map((server) => (
                  <option key={server.id} value={server.id} disabled={server.status !== "online" || failedServers.includes(server.id)}>
                    {server.name}{server.status !== "online" ? " · Offline" : failedServers.includes(server.id) ? " · Unavailable" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={styles.btn} onClick={fullscreen} aria-label="Fullscreen"><Maximize size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
