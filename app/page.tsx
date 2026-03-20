"use client";
import { Keyboard, type KeyboardInteractionEvent } from "@/components/ui/keyboard";
import { useEffect, useRef, useState } from "react";
import TypingTest from "@/components/TypingTest";

const THEMES = [
  { value: "classic", label: "Classic" },
  { value: "mint", label: "Mint" },
  { value: "royal", label: "Royal" },
  { value: "dolch", label: "Dolch" },
  { value: "sand", label: "Sand" },
  { value: "scarlet", label: "Scarlet" },
] as const;

type ThemeValue = (typeof THEMES)[number]["value"];

const THEME_COLORS: Record<ThemeValue, string> = {
  classic: "#737373",
  mint: "#86C8AC",
  royal: "#324974",
  dolch: "#4F5E78",
  sand: "#C94E41",
  scarlet: "#D5868A",
};

const TIME_OPTIONS = [
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
  { value: 120, label: "120s" },
] as const;

const WORD_OPTIONS = [
  { value: 10, label: "10" },
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
] as const;

type Mode = "time" | "words";

export default function Home() {
  const [theme, setTheme] = useState<ThemeValue>("classic");
  const [mode, setMode] = useState<Mode>("time");
  const [selectedTime, setSelectedTime] = useState<number>(30);
  const [selectedWords, setSelectedWords] = useState<number>(10);
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "finished">("idle");

  const timeOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wordOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [timeIndicatorStyle, setTimeIndicatorStyle] = useState<{ left: number; width: number } | null>(null);
  const [wordIndicatorStyle, setWordIndicatorStyle] = useState<{ left: number; width: number } | null>(null);

  const updateIndicatorStyle = (refs: React.MutableRefObject<(HTMLButtonElement | null)[]>, activeValue: number, mode: "time" | "words") => {
    const activeIndex = (mode === "time" ? TIME_OPTIONS : WORD_OPTIONS).findIndex((opt) => opt.value === activeValue);
    if (activeIndex >= 0 && refs.current[activeIndex]) {
      const btn = refs.current[activeIndex];
      if (btn) {
        const offsets = { left: btn.offsetLeft, width: btn.offsetWidth };
        if (mode === "time") {
          setTimeIndicatorStyle(offsets);
        } else {
          setWordIndicatorStyle(offsets);
        }
      }
    }
  };

  useEffect(() => {
    updateIndicatorStyle(timeOptionRefs, selectedTime, "time");
  }, [selectedTime]);

  useEffect(() => {
    updateIndicatorStyle(wordOptionRefs, selectedWords, "words");
  }, [selectedWords]);

  useEffect(() => {
    // Initialize indicator styles on mount
    updateIndicatorStyle(timeOptionRefs, selectedTime, "time");
    updateIndicatorStyle(wordOptionRefs, selectedWords, "words");
  }, []);
  return (
    <main className="min-h-screen bg-[#1a1a1a] flex flex-col pb-56">
      {/* Fixed vertical theme sidebar */}
      {testStatus !== "finished" && <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-4">
        {THEMES.map((t) => {
          const active = t.value === theme;
          return (
            <div
              key={t.value}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
              onClick={() => setTheme(t.value)}
            >
              <div
                className={[
                  "w-5 h-5 rounded-md transition-all duration-200",
                  active
                    ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a] scale-110"
                    : "opacity-50 hover:opacity-80",
                ].join(" ")}
                style={{ backgroundColor: THEME_COLORS[t.value] }}
              />
              <span
                className={[
                  "text-[8px] font-mono tracking-widest uppercase transition-colors duration-200",
                  active ? "text-white" : "text-gray-600 group-hover:text-gray-400",
                ].join(" ")}
              >
                {t.value}
              </span>
            </div>
          );
        })}
      </div>}

      {testStatus !== "finished" && <header className="w-full h-16 bg-[#1a1a1a] flex items-center px-10 gap-6">
        <div className="font-mono text-lg flex items-center gap-1">
          <span className="text-[#646669]">/</span>
          <span className="font-bold text-[#E2B714]">typo</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode("time")}
              className={[
                "px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors",
                mode === "time"
                  ? "text-[#E2B714]"
                  : "text-gray-500 hover:text-gray-300",
              ].join(" ")}
            >
              ⏱ time
            </button>
            <button
              type="button"
              onClick={() => setMode("words")}
              className={[
                "px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors",
                mode === "words"
                  ? "text-[#E2B714]"
                  : "text-gray-500 hover:text-gray-300",
              ].join(" ")}
            >
              A words
            </button>
          </div>

          <span className="text-gray-600">|</span>

          <div className="relative flex items-center gap-1 bg-[#1a1a1a] rounded-full px-1 py-1">
            {(mode === "time" && timeIndicatorStyle) || (mode === "words" && wordIndicatorStyle) ? (
              <div
                className="absolute rounded-full bg-[#2a2a2a] transition-all duration-300 ease-in-out"
                style={{
                  left: mode === "time" ? timeIndicatorStyle!.left : wordIndicatorStyle!.left,
                  width: mode === "time" ? timeIndicatorStyle!.width : wordIndicatorStyle!.width,
                  top: 0,
                  bottom: 0,
                }}
              />
            ) : null}
            {(mode === "time" ? TIME_OPTIONS : WORD_OPTIONS).map((opt, idx) => {
              const active =
                mode === "time"
                  ? opt.value === selectedTime
                  : opt.value === selectedWords;
              const handleClick = () => {
                if (mode === "time") {
                  setSelectedTime(opt.value);
                } else {
                  setSelectedWords(opt.value);
                }
              };
              return (
                <button
                  key={opt.label}
                  ref={(el) => {
                    if (mode === "time") {
                      timeOptionRefs.current[idx] = el;
                    } else {
                      wordOptionRefs.current[idx] = el;
                    }
                  }}
                  type="button"
                  onClick={handleClick}
                  className={[
                    "relative z-10 px-3 py-1 rounded-full text-xs font-mono cursor-pointer transition-colors",
                    active
                      ? "text-white font-medium"
                      : "text-gray-500 hover:text-gray-300",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>}

      <div className="flex-1 w-full flex flex-col items-center">
        <TypingTest
          mode={mode}
          selectedTime={selectedTime}
          selectedWords={selectedWords}
          onStatusChange={setTestStatus}
        />
      </div>

      {testStatus !== "finished" && (
        <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center justify-center pb-6 bg-gradient-to-t from-[#1a1a1a] to-transparent pt-10">
          <div className="w-full max-w-3xl mx-auto transform scale-100 flex justify-center">
            <Keyboard
              theme={theme}
              enableHaptics
              enableSound
              onKeyEvent={(_event: KeyboardInteractionEvent) => { }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
