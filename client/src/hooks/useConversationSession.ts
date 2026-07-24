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
const RATE_LIMIT_COOLDOWN_MS = 5000;

type CaptureFrame = () => string | Promise<string | null> | null;

export function useConversationSession(
  language: string,
  captureFrame: CaptureFrame,
  apiKey: string | null,
  markInvalid?: () => void,
) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownUntilRef = useRef(0);

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
    if (Date.now() < cooldownUntilRef.current) return;
    if (!apiKey) {
      setError("No API key configured. Please add your Gemini API key in settings.");
      return;
    }
    const image = await captureFrame();
    if (!image) return;

    try {
      setProcessing(true);
      const result = await sendFrame(sessionId, image, apiKey);
      if (result.session) {
        setEntries(result.session.entries ?? []);
        setElapsedMs(result.session.durationMs ?? elapsedMs);
      }
      if (result.entry) {
        setConfidence(result.entry.confidence);
      }
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Frame upload failed";
      setError(message);
      if (isAuthError(message) && markInvalid) {
        markInvalid();
      }
      if (isRateLimitError(message)) {
        cooldownUntilRef.current = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      }
    } finally {
      setProcessing(false);
    }
  }, [apiKey, captureFrame, elapsedMs, processing, sessionId, status]);

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
      cooldownUntilRef.current = 0;
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
      cooldownUntilRef.current = 0;
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

function isRateLimitError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("resource_exhausted") ||
    normalized.includes("rate limit") ||
    normalized.includes("quota exceeded") ||
    normalized.includes("429")
  );
}

function isAuthError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("api_key_invalid") ||
    normalized.includes("api key not valid") ||
    normalized.includes("invalid api key") ||
    normalized.includes("permission_denied") ||
    normalized.includes("401") ||
    normalized.includes("403")
  );
}
