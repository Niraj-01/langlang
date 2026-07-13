// Easy Translate: English ⇄ German, always returning two aligned lines
// (German / English) so beginners can read along.

import { NextRequest, NextResponse } from "next/server";
import { claude, claudeErrorResponse, textOf, parseJson, think, MODEL } from "@/lib/claude";

export const maxDuration = 20;

export interface TranslationDe {
  german: string;
  english: string;
}

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const res = await claude().messages.create({
      model: MODEL,
      max_tokens: 400,
      ...think("off"),
      system: `You are a translator for absolute-beginner German learners. Detect whether the input is English or German. If English, translate to natural German; if German, translate to natural English. Return STRICT JSON, no markdown fences:
{"german": "<the German sentence>", "english": "<the English sentence>"}
Always fill both fields. Keep it simple and natural — prefer everyday phrasing. No notes, no extra keys.`,
      messages: [{ role: "user", content: text.trim() }],
    });
    const data = parseJson<TranslationDe>(textOf(res));
    if (!data?.german || !data.english) {
      return NextResponse.json({ error: "bad_model_output" }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return claudeErrorResponse(err);
  }
}
