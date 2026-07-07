// Sentence mining: paste any real sentence, Claude breaks it down into
// reading, per-word gloss, grammar points, and a natural translation.

import { NextRequest, NextResponse } from "next/server";
import { claude, claudeErrorResponse, textOf, parseJson, MODEL } from "@/lib/claude";

export const maxDuration = 30;

const LANG_NAME = { ja: "Japanese", de: "German" } as const;

export interface MineBreakdown {
  reading?: string; // kana version of the whole sentence (ja)
  translation: string;
  words: { word: string; reading?: string; meaning: string; pos: string }[];
  grammar: { point: string; note: string }[];
}

export async function POST(req: NextRequest) {
  const { lang, sentence } = (await req.json()) as { lang: "ja" | "de"; sentence: string };
  if (!sentence?.trim() || !(lang in LANG_NAME)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const system = `You break down ${LANG_NAME[lang]} sentences for a learner mining real content. Return strict JSON, no markdown fences:
{
  ${lang === "ja" ? `"reading": "<full sentence in hiragana/katakana>",` : ""}
  "translation": "<natural English translation>",
  "words": [
    { "word": "<dictionary form>", ${lang === "ja" ? `"reading": "<kana>",` : ""} "meaning": "<concise English>", "pos": "<part of speech>" }
  ],
  "grammar": [ { "point": "<grammar point name>", "note": "<max 1 sentence>" } ]
}

Rules:
- "words": every content word (skip bare particles/articles), dictionary form, in order of appearance. Max 15.
- "grammar": 0-3 notable patterns, each note MAX one short sentence.
- Keep meanings tight — this becomes flashcard fronts.`;

  try {
    const response = await claude().messages.create({
      model: MODEL,
      max_tokens: 1200,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: sentence.trim() }],
    });
    const data = parseJson<MineBreakdown>(textOf(response));
    if (!data || !Array.isArray(data.words) || !data.translation) {
      return NextResponse.json({ error: "bad_model_output" }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return claudeErrorResponse(err);
  }
}
