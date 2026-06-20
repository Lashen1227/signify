import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, SessionStatus, TranscriptEntry } from "@/types/transcript";

const SAMPLE_PHRASES: Record<string, string[]> = {
  en: [
    "Hello, how are you?",
    "Nice to meet you.",
    "My name is Alex.",
    "Thank you very much.",
    "Could you help me, please?",
    "I am learning sign language.",
    "Where is the nearest station?",
    "Have a wonderful day.",
    "I understand what you mean.",
    "Let's continue the conversation.",
  ],
  si: ["ආයුබෝවන්.", "ඔබට කොහොමද?", "මට ඔබව හමුවීම සතුටක්.", "ස්තූතියි.", "මට උදව් කරන්න පුළුවන්ද?"],
  ta: ["வணக்கம்.", "நீங்கள் எப்படி இருக்கிறீர்கள்?", "உங்களை சந்தித்ததில் மகிழ்ச்சி.", "மிக்க நன்றி."],
  fr: ["Bonjour, comment allez-vous ?", "Enchanté de vous rencontrer.", "Je m'appelle Alex.", "Merci beaucoup."],
  de: ["Hallo, wie geht es Ihnen?", "Schön, Sie kennenzulernen.", "Ich heiße Alex.", "Vielen Dank."],
  es: ["Hola, ¿cómo estás?", "Mucho gusto en conocerte.", "Me llamo Alex.", "Muchas gracias."],
  ja: ["こんにちは、お元気ですか?", "はじめまして。", "私の名前はアレックスです。", "ありがとうございます。"],
};

const STORAGE_KEY = "signify:autosave";
const SESSIONS_KEY = "signify:sessions";

type Persisted = {
  language: string;
  entries: TranscriptEntry[];
  elapsedMs: number;
};

export function useTranscript(language: string) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [processing, setProcessing] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phraseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore autosave once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p: Persisted = JSON.parse(raw);
        setEntries(p.entries ?? []);
        setElapsedMs(p.elapsedMs ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  // Autosave
  useEffect(() => {
    const payload: Persisted = { language, entries, elapsedMs };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [language, entries, elapsedMs]);

  const scheduleNextPhrase = useCallback(() => {
    const delay = 1800 + Math.random() * 2400;
    phraseRef.current = setTimeout(() => {
      setProcessing(true);
      setTimeout(() => {
        const pool = SAMPLE_PHRASES[language] ?? SAMPLE_PHRASES.en;
        const text = pool[Math.floor(Math.random() * pool.length)];
        const conf = 0.78 + Math.random() * 0.21;
        setEntries((prev) => [
          ...prev,
          { id: crypto.randomUUID(), timestamp: Date.now(), text, confidence: conf },
        ]);
        setConfidence(conf);
        setProcessing(false);
        scheduleNextPhrase();
      }, 450);
    }, delay);
  }, [language]);

  const clearTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (phraseRef.current) clearTimeout(phraseRef.current);
    tickRef.current = null;
    phraseRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (status === "recording") return;
    setStatus("recording");
    tickRef.current = setInterval(() => setElapsedMs((m) => m + 1000), 1000);
    scheduleNextPhrase();
  }, [scheduleNextPhrase, status]);

  const pause = useCallback(() => {
    setStatus("paused");
    clearTimers();
  }, [clearTimers]);

  const resume = useCallback(() => {
    if (status !== "paused") return;
    setStatus("recording");
    tickRef.current = setInterval(() => setElapsedMs((m) => m + 1000), 1000);
    scheduleNextPhrase();
  }, [scheduleNextPhrase, status]);

  const stop = useCallback((): Session | null => {
    clearTimers();
    setStatus("stopped");
    setProcessing(false);
    if (entries.length === 0) return null;
    const session: Session = {
      id: crypto.randomUUID(),
      name: `Session ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      language,
      status: "stopped",
      durationMs: elapsedMs,
      entries,
      frameCount: entries.length,
    };
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      const list: Session[] = raw ? JSON.parse(raw) : [];
      list.unshift(session);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(list.slice(0, 20)));
    } catch {
      // ignore
    }
    return session;
  }, [clearTimers, elapsedMs, entries, language]);

  const reset = useCallback(() => {
    clearTimers();
    setStatus("idle");
    setEntries([]);
    setElapsedMs(0);
    setConfidence(0);
    setProcessing(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [clearTimers]);

  const clearTranscript = useCallback(() => {
    setEntries([]);
    setConfidence(0);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const words = entries.reduce((acc, e) => acc + e.text.trim().split(/\s+/).length, 0);

  return {
    status,
    entries,
    elapsedMs,
    confidence,
    processing,
    words,
    signs: entries.length,
    start,
    pause,
    resume,
    stop,
    reset,
    clearTranscript,
  };
}

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

export function deleteSession(id: string) {
  try {
    const list = loadSessions().filter((s) => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}
