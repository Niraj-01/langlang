// Easy Translate: English ⇄ Japanese, always returning three aligned lines
// (Japanese script / Hepburn romaji / English) so beginners can read along.

import { NextRequest, NextResponse } from "next/server";
import { claude, claudeErrorResponse, textOf, parseJson, think, MODEL } from "@/lib/claude";

export const maxDuration = 20;

export interface Translation {
  japanese: string;
  romaji: string;
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
      system: `You are a translator for absolute-beginner Japanese learners. Detect whether the input is English or Japanese. If English, translate to natural Japanese; if Japanese, translate to natural English. Return STRICT JSON, no markdown fences:
{"japanese": "<the Japanese sentence in Japanese script>", "romaji": "<Hepburn romaji of the Japanese, with macrons ō/ū for long vowels>", "english": "<the English sentence>"}
Always fill all three fields (romaji is always the reading of the japanese field). Keep it simple and natural — prefer polite (desu/masu) forms. No notes, no extra keys.`,
      messages: [{ role: "user", content: text.trim() }],
    });
    const data = parseJson<Translation>(textOf(res));
    if (!data?.japanese || !data.english) {
      return NextResponse.json({ error: "bad_model_output" }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return claudeErrorResponse(err);
  }
}
