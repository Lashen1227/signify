import type { Session, TranscriptEntry } from "@/types/transcript";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") || "http://localhost:8787";

type ApiEnvelope<T> = {
  session?: Session;
  sessions?: Session[];
  entry?: TranscriptEntry;
  message?: string;
} & T;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string };
      throw new Error(data.message ?? fallback);
    } catch {
      throw new Error(fallback);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function startSession(language: string) {
  const data = await request<ApiEnvelope<{}>>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ language }),
  });
  return data.session as Session;
}

export async function sendFrame(sessionId: string, image: string) {
  const data = await request<ApiEnvelope<{}>>(`/api/sessions/${sessionId}/frame`, {
    method: "POST",
    body: JSON.stringify({ image }),
  });
  return data;
}

export async function pauseSession(sessionId: string) {
  const data = await request<ApiEnvelope<{}>>(`/api/sessions/${sessionId}/pause`, {
    method: "POST",
  });
  return data.session as Session;
}

export async function resumeSession(sessionId: string) {
  const data = await request<ApiEnvelope<{}>>(`/api/sessions/${sessionId}/resume`, {
    method: "POST",
  });
  return data.session as Session;
}

export async function stopSession(sessionId: string, durationMs: number) {
  const data = await request<ApiEnvelope<{}>>(`/api/sessions/${sessionId}/stop`, {
    method: "POST",
    body: JSON.stringify({ durationMs }),
  });
  return data.session as Session;
}

export async function clearSession(sessionId: string) {
  const data = await request<ApiEnvelope<{}>>(`/api/sessions/${sessionId}/clear`, {
    method: "POST",
  });
  return data.session as Session;
}

export async function listSessions() {
  const data = await request<ApiEnvelope<{}>>("/api/sessions");
  return data.sessions ?? [];
}

export async function deleteSession(sessionId: string) {
  await request(`/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function downloadSessionPdf(sessionId: string, filename?: string) {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/pdf`);
  if (!response.ok) {
    throw new Error(`PDF export failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `signify-${sessionId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
