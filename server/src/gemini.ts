import type { GeminiAnalysis } from "./types.js";

const FALLBACK_PHRASES: Record<string, string[]> = {
  en: ["Hello, how can I help you?", "Thank you very much.", "I would like to continue."],
  si: ["à¶†à¶ºà·”à¶¶à·à·€à¶±à·Š.", "à¶¸à¶§ à¶‹à¶¯à·€à·Š à¶šà¶»à¶±à·Šà¶±.", "à¶­à·Šà¾°à¶±à·Šà¶­à·’à¶ºà·’."],
  ta: ["à®µà®£à®•à¯à®•à®®à¯.", "à®¨à®©à¯à®±à®¿.", "à®¤à¯‹à®Ÿà®°à¯à®ªà¯ à®¤à¯‹à®Ÿà®°à¯à®®à¯."],
  fr: ["Bonjour, comment allez-vous ?", "Merci beaucoup.", "Continuons la conversation."],
  de: ["Hallo, wie geht es Ihnen?", "Vielen Dank.", "Lassen Sie uns fortfahren."],
  es: ["Hola, ¿cómo está?", "Muchas gracias.", "Sigamos con la conversación."],
  ja: ["こんにちは、いかがですか？", "ありがとうございます。", "会話を続けましょう。"],
};

type ImageInput = {
  mimeType: string;
  data: string;
};

export async function analyzeFrame(image: string, targetLanguage: string): Promise<GeminiAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return mockAnalysis(targetLanguage);
  }

  try {
    const imageInput = parseImageData(image);
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const prompt = [
      "You are a sign language transcription engine.",
      "Study the provided webcam frame and infer the most likely sign language phrase.",
      "Return JSON with sourceText, translatedText, and confidence.",
      `Translate the meaning into ${targetLanguage}.`,
      "If the frame is unclear, say so honestly and lower confidence.",
      "Keep sourceText short and natural.",
      "Do not add markdown fences or extra commentary.",
    ].join(" ");

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
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const parsed = safeJsonParse(text);
    if (parsed) {
      return {
        sourceText: String(parsed.sourceText ?? parsed.source_text ?? parsed.text ?? "Unclear sign"),
        translatedText: String(
          parsed.translatedText ?? parsed.translated_text ?? parsed.translation ?? parsed.sourceText ?? parsed.text ?? "Unclear sign",
        ),
        confidence: clampNumber(Number(parsed.confidence ?? 0.7), 0.05, 0.99),
      };
    }

    return {
      sourceText: "Sign gesture detected",
      translatedText: text || "Unable to parse Gemini response",
      confidence: 0.65,
    };
  } catch {
    return mockAnalysis(targetLanguage);
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

function mockAnalysis(targetLanguage: string): GeminiAnalysis {
  const phrasePool = FALLBACK_PHRASES[targetLanguage] ?? FALLBACK_PHRASES.en;
  const sourceText = "Gesture detected";
  const translatedText = phrasePool[Math.floor(Math.random() * phrasePool.length)] ?? "Gesture detected";
  return {
    sourceText,
    translatedText,
    confidence: 0.72,
  };
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
