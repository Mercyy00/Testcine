import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useAmbientSource
 *
 * Resolves the optimal video frame source for Ambilight in priority order:
 * 1. Native HTML5 <video> element (HLS / direct stream - zero permission needed)
 * 2. Real-time Tab Capture MediaStream via getDisplayMedia (for cross-origin iframe embeds)
 * 3. Blurred TMDB Backdrop Artwork fallback
 */
export function useAmbientSource({ videoEl = null, anchorRef = null, showToast = null }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureVideo, setCaptureVideo] = useState(null);
  const streamRef = useRef(null);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      streamRef.current = null;
    }
    if (captureVideo) {
      try {
        captureVideo.pause();
        captureVideo.srcObject = null;
      } catch {}
      setCaptureVideo(null);
    }
    setIsCapturing(false);
  }, [captureVideo]);

  const startCapture = useCallback(async () => {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getDisplayMedia) {
      showToast?.("Screen sync is not supported on this device/browser.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
          preferCurrentTab: true,
        },
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
        systemAudio: "exclude",
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          stopCapture();
          showToast?.("Screen sync ended — using artwork ambient");
        };
      }

      streamRef.current = stream;
      setCaptureVideo(video);
      setIsCapturing(true);
      showToast?.("Live scene ambient sync enabled");
      return true;
    } catch (err) {
      if (err.name !== "NotAllowedError" && err.name !== "AbortError") {
        console.warn("Screen capture error:", err);
      }
      showToast?.("Real-time ambient sync cancelled — using artwork backdrop");
      return false;
    }
  }, [showToast, stopCapture]);

  const toggleCapture = useCallback(() => {
    if (isCapturing) {
      stopCapture();
      showToast?.("Switched to artwork ambient light");
    } else {
      startCapture();
    }
  }, [isCapturing, startCapture, stopCapture, showToast]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track) => track.stop());
        } catch {}
        streamRef.current = null;
      }
    };
  }, []);

  // Compute live crop rectangle for the player stage inside the captured tab
  const getCropRect = useCallback(() => {
    if (!captureVideo || !anchorRef?.current || typeof window === "undefined") return null;

    const rect = anchorRef.current.getBoundingClientRect();
    const vw = captureVideo.videoWidth || window.innerWidth;
    const vh = captureVideo.videoHeight || window.innerHeight;

    const scaleX = vw / Math.max(1, window.innerWidth);
    const scaleY = vh / Math.max(1, window.innerHeight);

    const x = Math.max(0, rect.left * scaleX);
    const y = Math.max(0, rect.top * scaleY);
    const width = Math.min(vw - x, rect.width * scaleX);
    const height = Math.min(vh - y, rect.height * scaleY);

    return { x, y, width, height };
  }, [captureVideo, anchorRef]);

  // Active video source: native video element first, then tab capture video
  const activeVideoEl = videoEl || (isCapturing ? captureVideo : null);
  const isLive = Boolean(activeVideoEl);

  return {
    activeVideoEl,
    isLive,
    isCapturing,
    toggleCapture,
    stopCapture,
    getCropRect: isCapturing ? getCropRect : null,
  };
}
