// Menace mode: Claude roasts the user into studying, from real stats.
// Gen-Z tone, opt-in, never repeats the same burn twice in a row (client
// passes the last one to avoid).

import { NextRequest, NextResponse } from "next/server";
import { claude, claudeErrorResponse, textOf, MODEL, think } from "@/lib/claude";

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const { streak, level, dueCount, daysSince, lang, avoid } = (await req.json()) as {
    streak: number;
    level: number;
    dueCount: number;
    daysSince: number;
    lang: "ja" | "de";
    avoid?: string;
  };

  const langName = lang === "ja" ? "Japanese" : "German";

  try {
    const response = await claude().messages.create({
      model: MODEL,
      max_tokens: 90,
      ...think("off"),
      output_config: { effort: "low" },
      system: `You are the "menace mode" notification voice of a language-learning app — a Gen-Z bestie who roasts the user into studying. One line, max 22 words, genuinely funny, a little mean but affectionate. Reference their actual stats. No emoji spam (one max), no hashtags, no quotes. Just the roast.`,
      messages: [
        {
          role: "user",
          content: `Learner is studying ${langName}. Current streak: ${streak} days. Level ${level}. ${dueCount} reviews due. Last studied ${daysSince} day(s) ago.${avoid ? `\nDon't reuse this line: "${avoid}"` : ""}\nRoast them into opening the app.`,
        },
      ],
    });
    return NextResponse.json({ roast: textOf(response).trim() });
  } catch (err) {
    return claudeErrorResponse(err);
  }
}
