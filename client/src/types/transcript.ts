export type TranscriptEntry = {
  id: string;
  timestamp: number;
  text: string;
  confidence: number;
  sourceText?: string;
};

export type SessionStatus = "idle" | "recording" | "paused" | "stopped";

export type LanguageOption = {
  code: string;
  label: string;
  flag: string;
};

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "si", label: "Sinhala", flag: "🇱🇰" },
  { code: "ta", label: "Tamil", flag: "🇮🇳" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
];

export type Session = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  language: string;
  status: SessionStatus;
  durationMs: number;
  entries: TranscriptEntry[];
  frameCount: number;
};
