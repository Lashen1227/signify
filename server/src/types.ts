export type SessionStatus = "idle" | "recording" | "paused" | "stopped";

export type TranscriptEntry = {
  id: string;
  timestamp: number;
  text: string;
  confidence: number;
  sourceText?: string;
};

export type Session = {
  id: string;
  name: string;
  language: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  durationMs: number;
  entries: TranscriptEntry[];
  frameCount: number;
};

export type GeminiAnalysis = {
  sourceText: string;
  translatedText: string;
  confidence: number;
};
