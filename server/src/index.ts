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

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: process.env.CLIENT_ORIGIN?.split(",").map((value) => value.trim()) ?? true,
});

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
  }).parse(request.body);

  const session = await getSession(params.id);
  if (!session) {
    return reply.code(404).send({ message: "Session not found" });
  }

  if (session.status !== "recording") {
    return reply.code(409).send({ message: "Session is not recording" });
  }

  const analysis = await analyzeFrame(body.image, session.language);
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

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
