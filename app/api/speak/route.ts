// One-line coaching for a shadowing attempt. The numeric score is computed
// locally on the client — Claude only adds the human touch.

import { NextRequest, NextResponse } from "next/server";
import { claude, claudeErrorResponse, textOf, MODEL } from "@/lib/claude";

export const maxDuration = 15;

const LANG_NAME = { ja: "Japanese", de: "German" } as const;

export async function POST(req: NextRequest) {
  const { lang, target, transcript, score } = (await req.json()) as {
    lang: "ja" | "de";
    target: string;
    transcript: string;
    score: number;
  };
  if (!target || typeof transcript !== "string" || !(lang in LANG_NAME)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const response = await claude().messages.create({
      model: MODEL,
      max_tokens: 80,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: `A learner is shadowing ${LANG_NAME[lang]} sentences. You get the target sentence, the speech-to-text transcript of their attempt, and a similarity score (0-100). Reply with EXACTLY ONE short, punchy coaching line in English (max 15 words). Point at the one most useful fix (a missed word, wrong sound STT likely caught, pacing) — or pure hype if the attempt was clean. No preamble, no quotes.`,
      messages: [
        {
          role: "user",
          content: `Target: ${target}\nThey said (STT): ${transcript || "(nothing recognized)"}\nScore: ${score}`,
        },
      ],
    });
    return NextResponse.json({ feedback: textOf(response).trim() });
  } catch (err) {
    return claudeErrorResponse(err);
  }
}
