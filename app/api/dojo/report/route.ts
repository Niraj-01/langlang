// Post-session report: what you said → what a native says → why.
// Every mistake becomes an FSRS card on the client.

import { NextRequest, NextResponse } from "next/server";
import { claude, claudeErrorResponse, textOf, parseJson, MODEL, think } from "@/lib/claude";
import { scenarioById } from "@/data/scenarios";

export const maxDuration = 60;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export interface DojoReport {
  mistakes: {
    youSaid: string;
    nativeSays: string;
    why: string; // max 2 sentences
    reading?: string; // kana reading of nativeSays (ja only)
    meaning: string; // English meaning of nativeSays
  }[];
  wins: string[]; // things the learner did well
}

const LANG_NAME = { ja: "Japanese", de: "German" } as const;

export async function POST(req: NextRequest) {
  const { scenarioId, messages } = (await req.json()) as {
    scenarioId: string;
    messages: Turn[];
  };
  const scenario = scenarioById(scenarioId);
  if (!scenario || !Array.isArray(messages)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const transcript = [
    `AI: ${scenario.opener}`,
    ...messages.map((m) => `${m.role === "user" ? "LEARNER" : "AI"}: ${m.content}`),
  ].join("\n");

  const system = `You are a ${LANG_NAME[scenario.lang]} teacher reviewing a beginner's (${scenario.level}) roleplay transcript. Analyze ONLY the LEARNER lines.

Return strict JSON, no markdown fences, matching:
{
  "mistakes": [
    {
      "youSaid": "<learner's exact words>",
      "nativeSays": "<natural ${LANG_NAME[scenario.lang]} version, same intent, ${scenario.level}-appropriate>",
      ${scenario.lang === "ja" ? `"reading": "<kana reading of nativeSays>",` : ""}
      "meaning": "<English meaning of nativeSays>",
      "why": "<why, MAX 2 short sentences, English>"
    }
  ],
  "wins": ["<1-3 short things they genuinely did well, English>"]
}

Rules:
- Only real mistakes (grammar, wrong word, unnatural phrasing, English fallbacks). Ignore missing politeness nuances beyond their level.
- Max 6 mistakes, most important first. If a line was fine, don't invent problems.
- "nativeSays" must be something a native would actually say in that situation.`;

  try {
    const response = await claude().messages.create({
      model: MODEL,
      max_tokens: 1500,
      ...think("adaptive"),
      system,
      messages: [{ role: "user", content: transcript }],
    });
    const report = parseJson<DojoReport>(textOf(response));
    if (!report || !Array.isArray(report.mistakes)) {
      return NextResponse.json({ error: "bad_model_output" }, { status: 502 });
    }
    return NextResponse.json(report);
  } catch (err) {
    return claudeErrorResponse(err);
  }
}
