"use client";

// Faithful reproduction of the Claude Design "Reels.dc.html" mockup — the
// phone-framed Reels screen, copied 1:1 (structure, colors, sizing, copy, and
// the design's own emoji). Standalone showcase route, separate from the live
// de-emoji'd /reels feed. The dc component's motion.js entrance is approximated
// with CSS keyframes; "Replay" re-triggers it.

import { useEffect, useState } from "react";

const ACCENT = "#ff3b1f";
const ACCENT_INK = "#ffffff";
const ARCHIVO = "var(--font-archivo), 'Archivo Black', sans-serif";
const JP = "var(--font-noto-jp), 'Noto Sans JP', sans-serif";
const BODY = "var(--font-source), 'Source Sans 3', system-ui, sans-serif";

export default function ReelsDesignPage() {
  const [booted, setBooted] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 700);
    return () => clearTimeout(t);
  }, []);

  const replay = () => {
    setBooted(false);
    setRunId((n) => n + 1);
    setTimeout(() => setBooted(true), 400);
  };

  // one tile-entrance keyframe with per-element delays (mirrors the dc "pop")
  const tile = (delay: number): React.CSSProperties => ({
    opacity: 0,
    animation: `dcPop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s forwards`,
  });

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#050507",
        padding: 24,
      }}
    >
      <style>{`
        @keyframes dcPop { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes dcFloat { from { transform: translateY(0); } to { transform: translateY(-8px); } }
        @keyframes dcPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        .dc-scroll::-webkit-scrollbar { display: none; }
        .dc-scroll { scrollbar-width: none; }
        .dc-press { transition: transform 0.1s; }
        .dc-press:active { transform: scale(0.96); }
        .dc-replay { transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), border-color 0.15s; }
        .dc-replay:hover { transform: scale(1.06); border-color: ${ACCENT}; }
      `}</style>

      <div
        style={{
          width: 380,
          fontFamily: BODY,
          WebkitFontSmoothing: "antialiased",
          // @ts-expect-error custom props
          "--ll-accent": ACCENT,
          "--ll-accent-ink": ACCENT_INK,
        }}
      >
        <div
          style={{
            position: "relative",
            padding: 11,
            background: "linear-gradient(150deg, #23232e, #050507)",
            borderRadius: 46,
            boxShadow: "0 30px 70px -20px rgba(0,0,0,0.85), 0 0 0 2px rgba(255,255,255,0.04) inset",
          }}
        >
          <div
            key={runId}
            style={{
              position: "relative",
              width: 358,
              height: 748,
              borderRadius: 36,
              overflow: "hidden",
              background: "#0b0b10",
              color: "#f2f2f5",
            }}
          >
            {/* notch */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                width: 108,
                height: 26,
                background: "#000",
                borderRadius: 16,
                zIndex: 40,
              }}
            />

            {/* HUD */}
            <div
              style={{
                position: "absolute",
                top: 40,
                left: 0,
                right: 0,
                zIndex: 30,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "6px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...tile(0.05) }}>
                <button
                  className="dc-press"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    border: "2px solid #2b2b3a",
                    background: "rgba(20,20,29,0.9)",
                    padding: "4px 8px",
                    borderRadius: 4,
                    boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
                    color: "#f2f2f5",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 16 }}>🐣</span>
                  <span style={{ fontFamily: ARCHIVO, fontSize: 11, opacity: 0.6 }}>LV</span>
                  <span style={{ fontFamily: ARCHIVO, fontSize: 12 }}>7</span>
                  <span style={{ display: "inline-block", animation: "dcFloat 1.6s ease-in-out infinite alternate" }}>🔥</span>
                  <span style={{ fontFamily: ARCHIVO, fontSize: 12 }}>12</span>
                </button>
                <div style={{ display: "flex" }}>
                  <button
                    className="dc-press"
                    style={{
                      border: `2px solid ${ACCENT}`,
                      background: "rgba(20,20,29,0.9)",
                      padding: "4px 8px",
                      borderRadius: 4,
                      boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
                      color: ACCENT,
                      fontFamily: ARCHIVO,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    🇯🇵 JA
                  </button>
                  <button
                    className="dc-press"
                    style={{
                      border: "2px solid #2b2b3a",
                      background: "rgba(20,20,29,0.9)",
                      padding: "4px 8px",
                      borderRadius: 4,
                      boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
                      color: "#f2f2f5",
                      opacity: 0.5,
                      fontFamily: ARCHIVO,
                      fontSize: 11,
                      marginLeft: -2,
                      cursor: "pointer",
                    }}
                  >
                    🇩🇪 DE
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", ...tile(0.14) }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    border: `2px solid ${ACCENT}`,
                    background: "rgba(20,20,29,0.95)",
                    padding: "4px 12px",
                    borderRadius: 4,
                    boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
                    color: ACCENT,
                  }}
                >
                  <span style={{ fontFamily: ARCHIVO, fontSize: 15 }}>×2</span>
                  <span style={{ fontSize: 10, letterSpacing: 1, opacity: 0.85 }}>4 COMBO</span>
                </div>
              </div>
            </div>

            {/* the card */}
            <div className="dc-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
              <section
                style={{
                  height: 748,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "96px 22px 28px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    border: "4px solid #2b2b3a",
                    background: "#14141d",
                    boxShadow: "8px 8px 0 rgba(0,0,0,0.6)",
                    padding: "32px 22px",
                    textAlign: "center",
                    ...tile(0.2),
                  }}
                >
                  <div
                    style={{
                      fontFamily: ARCHIVO,
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 3,
                      color: ACCENT,
                      marginBottom: 18,
                    }}
                  >
                    New word
                  </div>
                  <div style={{ fontFamily: JP, fontSize: 96, lineHeight: 1, animation: "dcFloat 4s ease-in-out infinite alternate" }}>
                    火
                  </div>
                  <div style={{ marginTop: 14, fontSize: 18, color: "#4aa8ff", letterSpacing: 2 }}>hi</div>
                  <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700 }}>fire</div>
                  <div style={{ marginTop: 16, borderTop: "2px solid #2b2b3a", paddingTop: 14, fontSize: 14, opacity: 0.7 }}>
                    <span style={{ fontFamily: JP }}>火よう日</span> · <span style={{ color: "#4aa8ff" }}>kayōbi</span> · Tuesday
                  </div>
                </div>

                <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
                  <button
                    className="dc-press"
                    style={{
                      border: "4px solid #2b2b3a",
                      background: "rgba(0,0,0,0.3)",
                      boxShadow: "4px 4px 0 rgba(0,0,0,0.5)",
                      padding: 16,
                      fontFamily: ARCHIVO,
                      fontSize: 15,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: "#f2f2f5",
                      cursor: "pointer",
                      ...tile(0.28),
                    }}
                  >
                    ↻ Again
                  </button>
                  <button
                    className="dc-press"
                    style={{
                      border: "4px solid #000",
                      background: ACCENT,
                      boxShadow: "4px 4px 0 rgba(0,0,0,0.6)",
                      padding: 16,
                      fontFamily: ARCHIVO,
                      fontSize: 15,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: ACCENT_INK,
                      cursor: "pointer",
                      ...tile(0.34),
                    }}
                  >
                    ✓ Got it
                  </button>
                </div>

                <div style={{ marginTop: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, ...tile(0.42) }}>
                  <div style={{ fontSize: 20, opacity: 0.5 }}>⌃</div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 3, opacity: 0.4 }}>swipe up for next</div>
                </div>
              </section>
            </div>

            {/* replay */}
            <button
              onClick={replay}
              className="dc-replay"
              style={{
                position: "absolute",
                bottom: 16,
                right: 12,
                zIndex: 35,
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid #2b2b3a",
                borderRadius: 999,
                background: "rgba(11,11,16,0.85)",
                backdropFilter: "blur(6px)",
                padding: "8px 13px",
                fontSize: 12,
                fontWeight: 600,
                color: "#f2f2f5",
                cursor: "pointer",
                boxShadow: "0 6px 18px -6px rgba(0,0,0,0.7)",
              }}
            >
              ↻ Replay
            </button>

            {/* skeleton */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
                background: "#0b0b10",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                opacity: booted ? 0 : 1,
                transition: "opacity 0.35s ease",
              }}
            >
              <div style={{ fontFamily: ARCHIVO, fontSize: 32, color: ACCENT, animation: "dcPulse 1.1s ease infinite" }}>
                langlang
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
