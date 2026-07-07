// Claude-generated brainrot meme using a vocab word. Emotional salience =
// memory. The client caches per word and always has a local fallback, so the
// feed never blocks on this.

import { NextRequest, NextResponse } from "next/server";
import { claude, claudeErrorResponse, textOf, MODEL, think } from "@/lib/claude";

export const maxDuration = 15;

const LANG_NAME = { ja: "Japanese", de: "German" } as const;

export async function POST(req: NextRequest) {
  const { lang, word, meaning } = (await req.json()) as {
    lang: "ja" | "de";
    word: string;
    meaning: string;
  };
  if (!word || !(lang in LANG_NAME)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const response = await claude().messages.create({
      model: MODEL,
      max_tokens: 120,
      ...think("off"),
      output_config: { effort: "low" },
      system: `You write short Gen-Z brainrot memes that make a ${LANG_NAME[lang]} vocab word stick. Given the word and its meaning, output ONE meme in a known format (e.g. "nobody:\\nme at 3am:\\n「word」", "POV:", "my toxic trait:", "it's giving...", tier-list, etc). The target word MUST appear in the meme in ${LANG_NAME[lang]}. Keep it 2-4 short lines, genuinely funny, a little unhinged. No hashtags, no explanation, no quotes around the whole thing — just the meme text.`,
      messages: [
        { role: "user", content: `word: ${word}\nmeaning: ${meaning}` },
      ],
    });
    const meme = textOf(response).trim();
    return NextResponse.json({ meme });
  } catch (err) {
    return claudeErrorResponse(err);
  }
}
