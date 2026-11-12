import { useEffect, useRef, useState } from "react";
// The UMD distribution includes its transmuxing worker, unlike the ESM build.
import Hls from "hls.js/dist/hls.js";

export default function useVideoPlayback({ streamUrl, retry, initialProgress = 0, onProgress, onFailure }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const resume = useRef({ time: null, playing: false });
  const callbacks = useRef({ onProgress, onFailure, initialProgress });
  callbacks.current = { onProgress, onFailure, initialProgress };
  const selectedHeight = useRef(-1);
  const [quality, setQuality] = useState(-1);
  const [qualities, setQualities] = useState([]);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState(-1);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(-1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;
    let disposed = false;
    let failed = false;
    let recoveryAttempted = false;
    let lastSaved = -5;
    let hls;
    setReady(false);
    setBuffering(true);
    setPlaying(false);
    setError("");
    setNotice("");
    setQualities([]);
    setCurrentHeight(0);
    setSubtitleTracks([]);
    setSelectedSubtitleTrack(-1);
    setAudioTracks([]);
    setSelectedAudioTrack(-1);

    const save = (force = false) => {
      if (!Number.isFinite(video.duration) || video.duration <= 0 || video.readyState < 1) return;
      resume.current.time = video.currentTime;
      setCurrentTime(video.currentTime);
      if (force || Math.abs(video.currentTime - lastSaved) >= 5) {
        lastSaved = video.currentTime;
        callbacks.current.onProgress?.(video.currentTime, video.duration);
      }
    };
    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      save(true);
      setError("Unable to play this stream. Try another server or retry playback.");
      setBuffering(false);
      setReady(false);
      hls?.stopLoad();
      if (!callbacks.current.onFailure?.()) {
        resume.current.playing = false;
        video.pause();
        setPlaying(false);
      }
    };
    const play = () => video.play().catch((reason) => {
      if (disposed || reason.name === "AbortError") return;
      resume.current.playing = false;
      setPlaying(false);
      setNotice("Press play to resume playback.");
    });
    const metadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      setDuration(video.duration);
      const position = resume.current.time ?? video.duration * Math.min(1, Math.max(0, callbacks.current.initialProgress));
      video.currentTime = Math.min(position, Math.max(0, video.duration - 0.1));
      resume.current.time = video.currentTime;
      setCurrentTime(video.currentTime);
    };
    const events = {
      loadedmetadata: metadata,
      durationchange: () => { if (Number.isFinite(video.duration)) setDuration(video.duration); },
      timeupdate: () => save(),
      seeked: () => save(true),
      play: () => { resume.current.playing = true; setPlaying(true); setNotice(""); },
      pause: () => { resume.current.playing = false; setPlaying(false); save(true); },
      playing: () => { setBuffering(false); setReady(true); },
      waiting: () => setBuffering(true),
      canplay: () => { setReady(true); setBuffering(false); if (resume.current.playing) play(); },
      ended: () => { resume.current.playing = false; setPlaying(false); save(true); },
      volumechange: () => { setVolume(video.volume); setMuted(video.muted); },
      error: fail,
    };
    Object.entries(events).forEach(([name, listener]) => video.addEventListener(name, listener));

    if (Hls.isSupported()) {
      hls = new Hls({ capLevelToPlayerSize: true,
        startPosition: resume.current.time ?? -1, backBufferLength: 30 });
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const heights = [...new Set(data.levels.map((level) => level.height).filter(Boolean))].sort((a, b) => a - b);
        setQualities(heights);
        const index = data.levels.findIndex((level) => level.height === selectedHeight.current);
        if (selectedHeight.current !== -1 && index === -1) { selectedHeight.current = -1; setQuality(-1); }
        hls.currentLevel = selectedHeight.current === -1 ? -1 : index;
      });
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        const tracks = (data.subtitleTracks || []).map((t, idx) => ({
          id: idx,
          label: t.name || t.lang || `Track ${idx + 1}`,
          lang: t.lang || "",
        }));
        setSubtitleTracks(tracks);
      });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
        const tracks = (data.audioTracks || []).map((t, idx) => ({
          id: idx,
          label: t.name || t.lang || `Audio ${idx + 1}`,
          lang: t.lang || "",
        }));
        setAudioTracks(tracks);
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => setCurrentHeight(hls.levels[data.level]?.height || 0));
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recoveryAttempted) {
          recoveryAttempted = true;
          hls.recoverMediaError();
        } else fail();
      });
      hls.attachMedia(video);
      hls.loadSource(streamUrl);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native fallback for Safari/iOS versions without MediaSource support.
      video.src = streamUrl;
      video.load();
    } else {
      fail();
    }
    return () => {
      disposed = true;
      save(true);
      // Detach listeners before destroying HLS so teardown's pause does not overwrite playback intent.
      Object.entries(events).forEach(([name, listener]) => video.removeEventListener(name, listener));
      hls?.destroy();
      hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [streamUrl, retry]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    if (!video.paused) { resume.current.playing = false; video.pause(); return; }
    if (video.ended) video.currentTime = 0;
    resume.current.playing = true;
    video.play().catch((reason) => {
      if (reason.name === "AbortError") return;
      resume.current.playing = false;
      setPlaying(false);
      setNotice("Playback could not start. Press play to try again.");
    });
  };
  const chooseQuality = (height) => {
    selectedHeight.current = height;
    setQuality(height);
    const hls = hlsRef.current;
    if (hls) hls.nextLevel = height === -1 ? -1 : hls.levels.findIndex((level) => level.height === height);
  };
  const seek = (time) => {
    if (ready && Number.isFinite(duration)) {
      videoRef.current.currentTime = Math.min(duration, Math.max(0, time));
      setCurrentTime(videoRef.current.currentTime);
    }
  };
  const chooseSubtitleTrack = (trackId) => {
    setSelectedSubtitleTrack(trackId);
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = trackId;
    }
    if (videoRef.current?.textTracks) {
      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        videoRef.current.textTracks[i].mode = i === trackId ? "showing" : "disabled";
      }
    }
  };

  const chooseAudioTrack = (trackId) => {
    setSelectedAudioTrack(trackId);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
    }
  };

  return {
    videoRef,
    playing,
    ready,
    buffering,
    duration,
    currentTime,
    volume,
    muted,
    error,
    notice,
    qualities,
    quality,
    currentHeight,
    subtitleTracks,
    selectedSubtitleTrack,
    chooseSubtitleTrack,
    audioTracks,
    selectedAudioTrack,
    chooseAudioTrack,
    togglePlay,
    seek,
    chooseQuality,
    setSpeed: (rate) => {
      if (videoRef.current) videoRef.current.playbackRate = rate;
    },
    toggleMute: () => {
      if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
    },
    changeVolume: (value) => {
      if (videoRef.current) {
        videoRef.current.volume = value;
        videoRef.current.muted = value === 0;
      }
    },
  };
}
