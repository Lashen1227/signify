import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Session, SessionStatus, TranscriptEntry } from "./types.js";

const DATA_FILE = join(process.cwd(), "data", "sessions.json");

let sessions: Session[] = [];
let loaded = false;

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    sessions = JSON.parse(raw) as Session[];
  } catch {
    sessions = [];
  }
}

async function persist() {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(sessions, null, 2), "utf8");
}

export async function listSessions() {
  await ensureLoaded();
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getSession(id: string) {
  await ensureLoaded();
  return sessions.find((session) => session.id === id) ?? null;
}

export async function createSession(language: string) {
  await ensureLoaded();
  const now = Date.now();
  const session: Session = {
    id: crypto.randomUUID(),
    name: `Session ${new Date(now).toLocaleString()}`,
    language,
    status: "recording",
    createdAt: now,
    updatedAt: now,
    durationMs: 0,
    entries: [],
    frameCount: 0,
  };
  sessions.unshift(session);
  await persist();
  return session;
}

export async function updateSession(id: string, patch: Partial<Session>) {
  await ensureLoaded();
  const session = sessions.find((item) => item.id === id);
  if (!session) return null;
  Object.assign(session, patch, { updatedAt: Date.now() });
  await persist();
  return session;
}

export async function appendEntry(id: string, entry: TranscriptEntry) {
  await ensureLoaded();
  const session = sessions.find((item) => item.id === id);
  if (!session) return null;
  session.entries.push(entry);
  session.frameCount += 1;
  session.updatedAt = Date.now();
  await persist();
  return session;
}

export async function clearTranscript(id: string) {
  await ensureLoaded();
  const session = sessions.find((item) => item.id === id);
  if (!session) return null;
  session.entries = [];
  session.frameCount = 0;
  session.updatedAt = Date.now();
  await persist();
  return session;
}

export async function stopSession(id: string, durationMs: number) {
  return updateSession(id, { status: "stopped", durationMs });
}

export async function pauseSession(id: string) {
  return updateSession(id, { status: "paused" });
}

export async function resumeSession(id: string) {
  return updateSession(id, { status: "recording" });
}

export async function deleteSession(id: string) {
  await ensureLoaded();
  const before = sessions.length;
  sessions = sessions.filter((session) => session.id !== id);
  if (sessions.length !== before) {
    await persist();
  }
}

export function normalizeSessionStatus(status: string): SessionStatus {
  return status === "recording" || status === "paused" || status === "stopped" ? status : "idle";
}
