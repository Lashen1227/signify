import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, SessionStatus, TranscriptEntry } from "@/types/transcript";
import {
  clearSession,
  pauseSession,
  resumeSession,
  sendFrame,
  startSession,
  stopSession,
} from "@/services/signifyApi";

const FRAME_INTERVAL_MS = 2500;

type CaptureFrame = () => string | Promise<string | null> | null;

export function useConversationSession(language: string, captureFrame: CaptureFrame) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = null;
  }, []);

  const syncElapsed = useCallback(() => {
    if (status !== "recording" || startedAtRef.current == null) return;
    setElapsedMs(Math.max(0, Date.now() - startedAtRef.current));
  }, [status]);

  const captureAndSend = useCallback(async () => {
    if (!sessionId || status !== "recording" || processing) return;
    const image = await captureFrame();
    if (!image) return;

    try {
      setProcessing(true);
      const result = await sendFrame(sessionId, image);
      if (result.session) {
        setEntries(result.session.entries ?? []);
        setElapsedMs(result.session.durationMs ?? elapsedMs);
      }
      if (result.entry) {
        setConfidence(result.entry.confidence);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Frame upload failed");
    } finally {
      setProcessing(false);
    }
  }, [captureFrame, elapsedMs, processing, sessionId, status]);

  useEffect(() => {
    if (status !== "recording" || !sessionId) return;
    timerRef.current = setInterval(() => {
      syncElapsed();
      void captureAndSend();
    }, FRAME_INTERVAL_MS);
    return clearTimer;
  }, [captureAndSend, clearTimer, sessionId, status, syncElapsed]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const start = useCallback(async () => {
    if (status === "recording") return;
    try {
      const session = await startSession(language);
      setSessionId(session.id);
      setEntries(session.entries ?? []);
      setElapsedMs(0);
      setConfidence(0);
      setStatus("recording");
      startedAtRef.current = Date.now();
      setError(null);
      clearTimer();
      timerRef.current = setInterval(() => {
        syncElapsed();
        void captureAndSend();
      }, FRAME_INTERVAL_MS);
      void captureAndSend();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start session");
    }
  }, [captureAndSend, clearTimer, language, status, syncElapsed]);

  const pause = useCallback(async () => {
    if (!sessionId || status !== "recording") return;
    try {
      await pauseSession(sessionId);
      clearTimer();
      syncElapsed();
      setStatus("paused");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pause session");
    }
  }, [clearTimer, sessionId, status, syncElapsed]);

  const resume = useCallback(async () => {
    if (!sessionId || status !== "paused") return;
    try {
      await resumeSession(sessionId);
      startedAtRef.current = Date.now() - elapsedMs;
      setStatus("recording");
      clearTimer();
      timerRef.current = setInterval(() => {
        syncElapsed();
        void captureAndSend();
      }, FRAME_INTERVAL_MS);
      void captureAndSend();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resume session");
    }
  }, [captureAndSend, clearTimer, elapsedMs, sessionId, status, syncElapsed]);

  const stop = useCallback(async (): Promise<Session | null> => {
    if (!sessionId) return null;
    try {
      clearTimer();
      syncElapsed();
      const finalDuration = elapsedMs;
      const session = await stopSession(sessionId, finalDuration);
      setStatus("stopped");
      setEntries(session.entries ?? []);
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stop session");
      return null;
    }
  }, [clearTimer, elapsedMs, sessionId, syncElapsed]);

  const clearTranscript = useCallback(async () => {
    if (!sessionId) {
      setEntries([]);
      setConfidence(0);
      return;
    }

    try {
      const session = await clearSession(sessionId);
      setEntries(session.entries ?? []);
      setConfidence(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear transcript");
    }
  }, [sessionId]);

  const words = useMemo(() => entries.reduce((acc, entry) => acc + entry.text.trim().split(/\s+/).length, 0), [entries]);

  return {
    sessionId,
    status,
    entries,
    elapsedMs,
    confidence,
    processing,
    error,
    words,
    signs: entries.length,
    start,
    pause,
    resume,
    stop,
    clearTranscript,
  };
}
