"use client";

// Kana recognition quiz — the Learn zone's self-check. Setup (alphabet, sets,
// length, pick-or-type) → one big character at a time → score against the
// 90% goal, with the misses shown and drillable. Misses also come back a few
// cards later inside the round. Local only: prefs and best scores live in
// localStorage, nothing touches the network. Pure logic is in lib/kanaQuiz.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import hiraganaData from "@/data/hiragana.json";
import katakanaData from "@/data/katakana.json";
import type { Kana } from "@/lib/types";
import {
  CHECK_LENGTH,
  PASS_PCT,
  answerRound,
  configKey,
  gradeTyped,
  kanaPool,
  newRound,
  passed,
  pickOptions,
  roundDone,
  sampleKana,
  scorePct,
  seenCount,
  shuffle,
  type AnswerMode,
  type KanaScript,
  type KanaSet,
  type Round,
} from "@/lib/kanaQuiz";
import { speakJa, canSpeak } from "@/lib/speak";
import { Icon } from "./Icon";

const HIRAGANA = hiraganaData as Kana[];
const KATAKANA = katakanaData as Kana[];
const STORE_KEY = "langlang.kanaQuiz.v1";
const ADVANCE_MS = 700;
const PRIMARY = "bg-accent text-white";
const SECONDARY = "border border-line bg-surface2 text-ink hover:border-accent";

interface Prefs {
  sets: KanaSet[];
  length: number; // 0 = every character in the pool
  mode: AnswerMode;
  best: Record<string, { correct: number; total: number }>;
}

const DEFAULT_PREFS: Prefs = { sets: ["basic"], length: CHECK_LENGTH, mode: "pick", best: {} };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    /* private mode / quota — prefs are a convenience */
  }
}

interface Reveal {
  ok: boolean;
  picked?: string; // pick mode: the option tapped
  alt?: boolean; // type mode: accepted, but not the Hepburn spelling
}

export function KanaQuiz({ defaultScript }: { defaultScript: "hiragana" | "katakana" }) {
  // Only ever mounted after a tap (the chart is the default view), so reading
  // localStorage in the initializer can't cause a hydration mismatch.
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [script, setScript] = useState<KanaScript>(defaultScript);
  const [round, setRound] = useState<Round | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [typed, setTyped] = useState("");
  const [newBest, setNewBest] = useState(false);

  const pool = useMemo(() => kanaPool(HIRAGANA, KATAKANA, script, prefs.sets), [script, prefs.sets]);
  const length = prefs.length && prefs.length < pool.length ? prefs.length : pool.length;
  const key = configKey(script, prefs.sets, length);
  const best = prefs.best[key];

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  const cur = round?.queue[0];
  const done = round && roundDone(round);

  const show = (r: Round) => {
    setRound(r);
    setReveal(null);
    setTyped("");
    if (r.queue[0]) setOptions(pickOptions(r.queue[0].kana, pool));
  };

  const start = () => {
    setNewBest(false);
    show(newRound(sampleKana(pool, length)));
  };

  const drill = () => {
    if (!round) return;
    setNewBest(false);
    show(newRound(shuffle(round.missed), "drill"));
  };

  const next = () => {
    if (!round || !reveal) return;
    const r = answerRound(round, reveal.ok);
    if (roundDone(r) && r.kind === "check") {
      const prev = prefs.best[key];
      if (!prev || r.correct / r.total > prev.correct / prev.total) {
        update({ best: { ...prefs.best, [key]: { correct: r.correct, total: r.total } } });
        setNewBest(!!prev);
      }
    }
    show(r);
  };

  const pick = (opt: string) => {
    if (!cur || reveal) return;
    setReveal({ ok: opt === cur.kana.romaji, picked: opt });
  };

  const check = () => {
    if (!cur || reveal) return;
    const g = gradeTyped(cur.kana, typed);
    setReveal({ ok: g !== "wrong", alt: g === "alt" });
  };

  // a right answer moves on by itself; a miss waits so the answer can sink in
  useEffect(() => {
    if (!reveal?.ok) return;
    const t = setTimeout(next, ADVANCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal]);

  // 1–4 answer pick questions from a keyboard
  useEffect(() => {
    if (!cur || reveal || prefs.mode !== "pick") return;
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < options.length) pick(options[i]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, reveal, options, prefs.mode]);

  // ---------- setup ----------
  if (!round) {
    const setCount = (s: KanaSet) => kanaPool(HIRAGANA, KATAKANA, script, [s]).length;
    const toggleSet = (s: KanaSet) => {
      const has = prefs.sets.includes(s);
      if (has && prefs.sets.length === 1) return; // keep at least one set
      update({ sets: has ? prefs.sets.filter((x) => x !== s) : [...prefs.sets, s] });
    };
    const need = Math.ceil((length * PASS_PCT) / 100);

    return (
      <section className="rise rounded-2xl border border-line bg-surface p-4">
        <div className="text-[11px] uppercase tracking-widest text-muted">Self-check</div>
        <h2 className="mt-1 text-base font-bold">
          {length === pool.length ? `All ${length} characters` : `${length} random characters`}, aim for{" "}
          {PASS_PCT}%
        </h2>
        <p className="mt-1 text-sm text-muted">
          Choose the romaji for each character. Misses come back a few cards later.
        </p>

        <Field label="Alphabet">
          <Segmented
            value={script}
            onChange={setScript}
            options={[
              ["hiragana", "Hiragana"],
              ["katakana", "Katakana"],
              ["mixed", "Mixed"],
            ]}
          />
        </Field>

        <Field label="Characters · pick any">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["basic", "Basic"],
                ["dakuten", "Dakuten"],
                ["yoon", "Combos"],
              ] as [KanaSet, string][]
            ).map(([s, label]) => {
              const on = prefs.sets.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSet(s)}
                  aria-pressed={on}
                  className={`press min-h-11 rounded-lg border px-1 text-sm font-medium transition-colors ${
                    on ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface2 text-muted hover:text-ink"
                  }`}
                >
                  {label} <span className="opacity-50">{setCount(s)}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Length">
          <Segmented
            value={length === pool.length ? 0 : length}
            onChange={(n) => update({ length: n })}
            options={[
              [10, "10"],
              [CHECK_LENGTH, `${CHECK_LENGTH}`],
              [0, `All ${pool.length}`],
            ]}
          />
        </Field>

        <Field label="Answer by">
          <Segmented
            value={prefs.mode}
            onChange={(mode) => update({ mode })}
            options={[
              ["pick", "Picking"],
              ["type", "Typing"],
            ]}
          />
        </Field>

        <div className="mt-4 text-xs text-muted">
          {best
            ? `Best on this set: ${best.correct} / ${best.total} (${scorePct(best)}%)`
            : `Pass mark: ${need} of ${length} right on the first try.`}
        </div>
        <button
          onClick={start}
          className="press mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white"
        >
          <Icon name="play" size={16} /> Start
        </button>
      </section>
    );
  }

  // ---------- results ----------
  if (done) {
    const pct = scorePct(round);
    const ok = passed(round);
    const isCheck = round.kind === "check";
    const missed = round.missed;
    // one accent action: the Path once the check is passed, else the misses
    const primary = isCheck && ok ? "path" : missed.length ? "drill" : "new";
    const btn = "press flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold";
    return (
      <section className="rise rounded-2xl border border-line bg-surface p-4 text-center">
        <div className="text-[11px] uppercase tracking-widest text-muted">
          {isCheck ? "Your score" : "Practice round"}
        </div>
        <div className="mt-2 text-5xl font-bold tabular-nums">
          {round.correct}
          <span className="text-2xl text-muted"> / {round.total}</span>
        </div>
        <div className="mt-1 text-sm text-muted">{pct}% right on the first try</div>

        {isCheck && (
          <div
            className={`mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              ok ? "border-good/50 bg-good/10 text-good" : "border-line bg-surface2 text-muted"
            }`}
          >
            <Icon name={ok ? "check" : "target"} size={14} />
            {ok
              ? newBest
                ? "Goal reached — new best"
                : "Goal reached"
              : `Goal is ${PASS_PCT}% — ${Math.ceil((round.total * PASS_PCT) / 100) - round.correct} more next time`}
          </div>
        )}

        {missed.length > 0 && (
          <div className="mt-5 text-left">
            <div className="mb-2 text-[11px] uppercase tracking-widest text-muted">
              Missed — tap to hear
            </div>
            <div className="grid grid-cols-5 gap-2">
              {missed.map((k) => (
                <button
                  key={k.char}
                  onClick={() => canSpeak() && speakJa(k.char)}
                  className="press flex flex-col items-center rounded-xl border border-line bg-surface2 py-2 hover:border-accent"
                >
                  <span className="jp text-2xl leading-none">{k.char}</span>
                  <span className="romaji mt-1 text-[11px]">{k.romaji}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {primary === "path" && (
            <Link href="/path" className={`${btn} ${PRIMARY}`}>
              Continue to the Path <Icon name="arrowRight" size={16} />
            </Link>
          )}
          {missed.length > 0 && (
            <button onClick={drill} className={`${btn} ${primary === "drill" ? PRIMARY : SECONDARY}`}>
              <Icon name="repeat" size={16} /> Practice the {missed.length} missed
            </button>
          )}
          <button onClick={start} className={`${btn} ${primary === "new" ? PRIMARY : SECONDARY}`}>
            <Icon name="dice" size={16} /> New round
          </button>
          {primary !== "path" && (
            <Link
              href="/path"
              className="flex min-h-11 items-center justify-center gap-1.5 text-sm text-muted hover:text-ink"
            >
              Go to the Path <Icon name="arrowRight" size={14} />
            </Link>
          )}
          <button onClick={() => setRound(null)} className="min-h-11 text-sm text-muted hover:text-ink">
            Change settings
          </button>
        </div>
      </section>
    );
  }

  // ---------- question ----------
  if (!cur) return null;
  const seen = seenCount(round);
  const speech = canSpeak();

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setRound(null)}
          aria-label="End round"
          className="-m-2 flex size-11 items-center justify-center text-muted hover:text-ink"
        >
          <Icon name="x" size={18} />
        </button>
        <div className="h-1.5 flex-1 rounded-full bg-line">
          <div
            className="h-1.5 rounded-full bg-accent transition-all duration-300"
            style={{ width: `${(seen / round.total) * 100}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted">
          {Math.min(seen + (cur.repeat ? 0 : 1), round.total)} / {round.total}
        </span>
      </div>

      <div className="mt-4 flex h-5 justify-center">
        {cur.repeat && (
          <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted">
            <Icon name="repeat" size={12} /> Once more
          </span>
        )}
      </div>
      <div
        key={`${cur.kana.char}-${seen}-${round.queue.length}`}
        className="rise jp py-3 text-center text-8xl leading-none"
        lang="ja"
      >
        {cur.kana.char}
      </div>

      {prefs.mode === "pick" ? (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {options.map((opt, i) => {
            const right = opt === cur.kana.romaji;
            const chosen = reveal?.picked === opt;
            const tone = !reveal
              ? "border-line bg-surface2 text-ink hover:border-accent"
              : right
                ? "border-good bg-good/10 text-good"
                : chosen
                  ? "border-bad bg-bad/10 text-bad"
                  : "border-line bg-surface2 text-muted opacity-50";
            return (
              <button
                key={opt}
                onClick={() => pick(opt)}
                disabled={!!reveal}
                className={`press relative min-h-14 rounded-xl border text-lg font-semibold tracking-wide transition-colors ${tone}`}
              >
                <span className="absolute left-2.5 top-1.5 hidden text-[10px] text-muted sm:block">{i + 1}</span>
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (reveal) next();
            else if (typed.trim()) check();
          }}
        >
          <input
            value={typed}
            onChange={(e) => !reveal && setTyped(e.target.value)}
            readOnly={!!reveal}
            autoFocus
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint={reveal ? "next" : "done"}
            placeholder="Type the romaji"
            aria-label="Romaji"
            className={`min-h-12 min-w-0 flex-1 rounded-xl border bg-surface2 px-4 text-lg outline-none transition-colors ${
              !reveal ? "border-line focus:border-accent" : reveal.ok ? "border-good text-good" : "border-bad text-bad"
            }`}
          />
          {!reveal && (
            <button
              type="submit"
              disabled={!typed.trim()}
              className="press min-h-12 rounded-xl bg-accent px-5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Check
            </button>
          )}
        </form>
      )}

      {/* feedback — fixed height so the layout never jumps */}
      <div className="mt-4 flex min-h-12 items-center gap-2" aria-live="polite">
        {!reveal ? (
          prefs.mode === "type" && (
            <button
              onClick={() => setReveal({ ok: false })}
              className="min-h-11 text-sm text-muted hover:text-ink"
            >
              I don&apos;t know — show me
            </button>
          )
        ) : (
          <>
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${reveal.ok ? "text-good" : "text-bad"}`}>
              <Icon name={reveal.ok ? "check" : "x"} size={16} />
              {reveal.ok ? (
                reveal.alt ? (
                  <span>
                    Right — usually written <span className="romaji">{cur.kana.romaji}</span>
                  </span>
                ) : (
                  "Right"
                )
              ) : (
                <span>
                  It&apos;s <span className="romaji text-base">{cur.kana.romaji}</span>
                </span>
              )}
            </span>
            {speech && (
              <button
                onClick={() => speakJa(cur.kana.char)}
                aria-label={`Hear ${cur.kana.char}`}
                className="flex size-11 items-center justify-center rounded-lg text-muted hover:text-accent"
              >
                <Icon name="sound" size={16} />
              </button>
            )}
            {!reveal.ok && (
              <button
                onClick={next}
                autoFocus={prefs.mode === "pick"}
                className="press ml-auto flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-white"
              >
                Next <Icon name="arrowRight" size={15} />
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[11px] uppercase tracking-widest text-muted">{label}</div>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex gap-2">
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`press min-h-11 flex-1 rounded-lg border px-2 text-sm font-medium transition-colors ${
            value === v
              ? "border-accent bg-accent/10 text-accent"
              : "border-line bg-surface2 text-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
