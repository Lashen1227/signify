import "./env.js";
import { Readable } from "node:stream";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import {
  appendEntry,
  clearTranscript,
  createSession,
  deleteSession,
  getSession,
  listSessions,
  pauseSession,
  resumeSession,
  stopSession,
} from "./store.js";
import { analyzeFrame } from "./gemini.js";
import { createSessionPdf } from "./pdf.js";
import type { ApiKeyValidation } from "./types.js";

const app = Fastify({
  logger: true,
});

const allowedOrigins = process.env.CLIENT_ORIGIN
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
});

app.get("/", async () => ({
  name: "Signify API",
  version: "1.0.0",
  health: "/health",
  docs: {
    languages: "GET /api/languages",
    validateKey: "POST /api/validate-key { apiKey }",
    sessions: "GET /api/sessions",
    createSession: "POST /api/sessions { language }",
    getSession: "GET /api/sessions/:id",
    sendFrame: "POST /api/sessions/:id/frame { image, apiKey }",
    pauseSession: "POST /api/sessions/:id/pause",
    resumeSession: "POST /api/sessions/:id/resume",
    stopSession: "POST /api/sessions/:id/stop { durationMs }",
    clearTranscript: "POST /api/sessions/:id/clear",
    deleteSession: "DELETE /api/sessions/:id",
    exportPdf: "GET /api/sessions/:id/pdf",
  },
}));

app.get("/health", async () => ({ ok: true }));

app.get("/api/languages", async () => ({
  languages: [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "si", label: "Sinhala", flag: "🇱🇰" },
    { code: "ta", label: "Tamil", flag: "🇮🇳" },
    { code: "fr", label: "French", flag: "🇫🇷" },
    { code: "de", label: "German", flag: "🇩🇪" },
    { code: "es", label: "Spanish", flag: "🇪🇸" },
    { code: "ja", label: "Japanese", flag: "🇯🇵" },
  ],
}));

app.post("/api/validate-key", async (request, reply) => {
  const body = z.object({ apiKey: z.string().min(1) }).parse(request.body);

  try {
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": body.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with only the word OK" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      },
    );

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (response.ok) {
      return { valid: true, message: "API key is valid" } satisfies ApiKeyValidation;
    }

    const errorPayload = payload as { error?: { message?: string; status?: string } } | null;
    const reason = errorPayload?.error?.message ?? `Request failed with status ${response.status}`;
    console.error(`[validate-key] status=${response.status} reason=${reason}`);
    return { valid: false, message: reason } satisfies ApiKeyValidation;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reach Gemini API";
    console.error(`[validate-key] catch: ${message}`);
    return { valid: false, message } satisfies ApiKeyValidation;
  }
});

app.get("/api/sessions", async () => {
  return { sessions: await listSessions() };
});

app.post("/api/sessions", async (request, reply) => {
  const body = z.object({ language: z.string().min(1) }).parse(request.body);
  const session = await createSession(body.language);
  return reply.code(201).send({ session });
});

app.get("/api/sessions/:id", async (request, reply) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
  const session = await getSession(id);
  if (!session) {
    return reply.code(404).send({ message: "Session not found" });
  }
  return { session };
});

app.post("/api/sessions/:id/frame", async (request, reply) => {
  const params = z.object({ id: z.string().min(1) }).parse(request.params);
  const body = z.object({
    image: z.string().min(1),
    apiKey: z.string().min(1),
  }).parse(request.body);

  const session = await getSession(params.id);
  if (!session) {
    return reply.code(404).send({ message: "Session not found" });
  }

  if (session.status !== "recording") {
    return reply.code(409).send({ message: "Session is not recording" });
  }

  const analysis = await analyzeFrame(body.image, session.language, body.apiKey);
  const entry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    text: analysis.translatedText,
    confidence: analysis.confidence,
    sourceText: analysis.sourceText,
  };

  const updated = await appendEntry(session.id, entry);
  return { session: updated, entry };
});

app.post("/api/sessions/:id/pause", async (request, reply) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
  const session = await pauseSession(id);
  if (!session) return reply.code(404).send({ message: "Session not found" });
  return { session };
});

app.post("/api/sessions/:id/resume", async (request, reply) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
  const session = await resumeSession(id);
  if (!session) return reply.code(404).send({ message: "Session not found" });
  return { session };
});

app.post("/api/sessions/:id/stop", async (request, reply) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
  const body = z.object({ durationMs: z.number().int().nonnegative() }).parse(request.body);
  const session = await stopSession(id, body.durationMs);
  if (!session) return reply.code(404).send({ message: "Session not found" });
  return { session };
});

app.post("/api/sessions/:id/clear", async (request, reply) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
  const session = await clearTranscript(id);
  if (!session) return reply.code(404).send({ message: "Session not found" });
  return { session };
});

app.delete("/api/sessions/:id", async (request, reply) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
  await deleteSession(id);
  return reply.code(204).send();
});

app.get("/api/sessions/:id/pdf", async (request, reply) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
  const session = await getSession(id);
  if (!session) return reply.code(404).send({ message: "Session not found" });

  const doc = createSessionPdf(session);
  const stream = Readable.toWeb(doc) as unknown as ReadableStream;

  reply
    .header("Content-Type", "application/pdf")
    .header("Content-Disposition", `attachment; filename="signify-${session.id}.pdf"`);

  doc.end();
  return reply.send(stream);
});

const port = Number(process.env.PORT) || 8787;
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
