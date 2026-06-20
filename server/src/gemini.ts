import "./env.js";
import type { GeminiAnalysis } from "./types.js";

type ImageInput = {
  mimeType: string;
  data: string;
};

const TARGET_LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  si: "Sinhala",
  ta: "Tamil",
  fr: "French",
  de: "German",
  es: "Spanish",
  ja: "Japanese",
};

export async function analyzeFrame(image: string, targetLanguage: string): Promise<GeminiAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return createFallbackAnalysis(targetLanguage, "GEMINI_API_KEY is not configured");
  }

  const imageInput = parseImageData(image);
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const languageName = TARGET_LANGUAGE_LABELS[targetLanguage.toLowerCase()] ?? targetLanguage;
  const prompt = [
    "You are a professional sign language interpreter and transcription engine.",
    "Study the provided webcam frame carefully and identify the exact sign language gesture being performed.",
    "Return valid JSON only with these fields:",
    "  - sourceText: the original sign language phrase being expressed (in English notation)",
    "  - translatedText: the natural language translation of the sign into the target language",
    "  - confidence: a number between 0 and 1 indicating how certain you are of the interpretation",
    `Translate the meaning into ${languageName}.`,
    "Recognize any sign language gesture including letters, words, phrases, and sentences.",
    "If the frame shows no clear sign or the gesture is ambiguous, set confidence low (0.1-0.3) and explain briefly in sourceText.",
    "Keep translatedText natural and fluent in the target language.",
    "Do not add markdown fences, code blocks, or any text outside the JSON object.",
  ].join("\n");

  try {
    return await requestGeminiAnalysis(endpoint, apiKey, prompt, imageInput, targetLanguage);
  } catch (error) {
    return createFallbackAnalysis(
      targetLanguage,
      error instanceof Error ? error.message : "Gemini analysis failed",
    );
  }
}

function parseImageData(image: string): ImageInput {
  const match = /^data:(.+?);base64,(.+)$/.exec(image);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: "image/jpeg", data: image };
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input) as Record<string, unknown>;
  } catch {
    const match = input.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

async function requestGeminiAnalysis(
  endpoint: string,
  apiKey: string,
  prompt: string,
  imageInput: ImageInput,
  targetLanguage: string,
): Promise<GeminiAnalysis> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: imageInput.mimeType,
                  data: imageInput.data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const reason = await readGeminiError(response);
      if ((response.status === 429 || response.status === 503) && attempt < maxAttempts) {
        const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
        const backoffMs = retryAfter ?? Math.min(30000, 2000 * 2 ** (attempt - 1));
        console.warn(
          `[gemini] rate limited (${response.status}). Retrying in ${backoffMs}ms. Reason: ${reason}`,
        );
        await sleep(backoffMs);
        continue;
      }
      throw new Error(reason);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text =
      payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const parsed = safeJsonParse(text);
    if (parsed) {
      return {
        sourceText: String(parsed.sourceText ?? parsed.source_text ?? "Unknown gesture"),
        translatedText: String(
          parsed.translatedText ?? parsed.translated_text ?? parsed.translation ?? "Unable to interpret",
        ),
        confidence: clampNumber(Number(parsed.confidence ?? 0.5), 0.05, 0.99),
      };
    }

    throw new Error("Failed to parse Gemini response");
  }

  throw new Error(`Gemini request failed after ${maxAttempts} attempts`);
}

function createFallbackAnalysis(targetLanguage: string, reason: string): GeminiAnalysis {
  console.warn(`[gemini] ${reason}`);
  return {
    sourceText: reason,
    translatedText: `AI analysis unavailable: ${reason}. Target language: ${targetLanguage}.`,
    confidence: 0.15,
  };
}

async function readGeminiError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string; status?: string };
      message?: string;
    };
    return payload.error?.message ?? payload.message ?? `Gemini request failed with status ${response.status}`;
  } catch {
    return `Gemini request failed with status ${response.status}`;
  }
}

function parseRetryAfter(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = new Date(value);
  const ms = date.getTime() - Date.now();
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
