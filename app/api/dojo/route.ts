// One conversation turn in the Dojo. Claude stays in character, speaks at
// the learner's level, and never corrects mid-session (flow > interruption).

import { NextRequest, NextResponse } from "next/server";
import { claude, claudeErrorResponse, textOf, MODEL } from "@/lib/claude";
import { scenarioById } from "@/data/scenarios";

export const maxDuration = 30;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const LANG_NAME = { ja: "Japanese", de: "German" } as const;

export async function POST(req: NextRequest) {
  const { scenarioId, messages } = (await req.json()) as {
    scenarioId: string;
    messages: Turn[];
  };
  const scenario = scenarioById(scenarioId);
  if (!scenario || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const system = `You are roleplaying with a beginner ${LANG_NAME[scenario.lang]} learner (${scenario.level} level) inside a language-learning game.

Scenario: ${scenario.setting}
You play: ${scenario.aiRole}. The learner plays: ${scenario.userRole}.
Your first line was: 「${scenario.opener}」

Rules:
- Stay in character the whole time. Speak ONLY ${LANG_NAME[scenario.lang]}.
- Keep every reply to 1-2 short sentences at ${scenario.level} level. Simple vocabulary and grammar only.
- NEVER correct the learner's mistakes and never explain grammar — corrections come after the session, not during. If you understand what they meant, just respond naturally.
- If the learner writes in English, respond in ${LANG_NAME[scenario.lang]} with a gentle in-character nudge (e.g. a puzzled reaction), still no English.
- Ask questions to keep the conversation alive. Be warm and a little playful.`;

  try {
    const response = await claude().messages.create({
      model: MODEL,
      max_tokens: 200,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system,
      // first message must be role "user" — the opener lives in the system
      // prompt; the client sends history starting from the learner's reply
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return NextResponse.json({ reply: textOf(response).trim() });
  } catch (err) {
    return claudeErrorResponse(err);
  }
}
