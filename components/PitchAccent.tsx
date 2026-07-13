"use client";

// Tokyo pitch-accent contour. `pitch` is the mora AFTER which the pitch drops
// (0 = heiban, no drop). We split the reading into morae (small ゃゅょ etc.
// attach to the preceding kana), then draw the standard low/high pattern:
//   mora 1 is low unless the accent is on it (atamadaka);
//   morae rise to high and drop after the `pitch`-th mora.
// A ┐ marks the downstep. This is a learning aid, not a replacement for audio.

const SMALL = new Set("ゃゅょぁぃぅぇぉゎゕゖッャュョァィゥェォヮ");

function toMorae(reading: string): string[] {
  const out: string[] = [];
  for (const ch of reading) {
    if (SMALL.has(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

// high/low per mora for Tokyo accent given drop position `pitch`
function contour(n: number, pitch: number): boolean[] {
  return Array.from({ length: n }, (_, i) => {
    const m = i + 1; // 1-indexed mora
    if (pitch === 0) return m !== 1; // heiban: low then high
    if (pitch === 1) return m === 1; // atamadaka: high then low
    return m > 1 && m <= pitch; // nakadaka/odaka: high in the middle band
  });
}

export function PitchAccent({
  reading,
  pitch,
  className = "",
}: {
  reading: string;
  pitch: number;
  className?: string;
}) {
  const morae = toMorae(reading);
  const hi = contour(morae.length, pitch);

  return (
    <span className={`inline-flex items-end gap-px font-mono ${className}`} aria-label={`pitch accent ${pitch}`}>
      {morae.map((m, i) => {
        const drop = hi[i] && i + 1 < morae.length && !hi[i + 1]; // downstep after this mora
        return (
          <span key={i} className="relative inline-block px-px">
            <span
              className="absolute inset-x-0 top-0 block h-[2px]"
              style={{ background: hi[i] ? "var(--accent, #ff3b1f)" : "transparent" }}
            />
            {/* left/right edges connect the overline; downstep drawn as a right wall */}
            {drop && <span className="absolute right-0 top-0 block h-2 w-[2px]" style={{ background: "var(--accent, #ff3b1f)" }} />}
            <span className="pt-1 leading-none">{m}</span>
          </span>
        );
      })}
    </span>
  );
}
