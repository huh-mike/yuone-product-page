"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BODY, EYEBROW, TITLE, sectionTimeline, vf } from "../beats";
import { sfx } from "../sound";
import { control, stage, type ControlState } from "../stage";

gsap.registerPlugin(useGSAP);

const useControl = () => useSyncExternalStore(control.subscribe, control.get, control.get);

const LABEL = {
  ...vf(400, 105),
  fontSize: "0.62rem",
  letterSpacing: "0.26em",
};

type SwitchKey = "light" | "flow" | "uv";
const SWITCHES: { key: SwitchKey; name: string; note: string }[] = [
  { key: "light", name: "Light", note: "Panel under the base" },
  { key: "flow", name: "Flow", note: "Airflow" },
  { key: "uv", name: "UV Glow", note: "UV-light cycle" },
];

function Switch({ name, note, on, disabled, onChange }: { name: string; note: string; on: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-2 text-left transition hover:bg-white/[0.1] disabled:hover:bg-white/[0.06] sm:py-3"
    >
      <span>
        <span className="block font-brand text-[13px] text-white">{name}</span>
        <span className="hidden font-brand text-[11px] text-white/45 sm:block">{note}</span>
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-[#F0765A]" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${on ? "translate-x-[18px]" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  );
}

/** The app, as a working panel: what you set here is what the unit on the right does. */
function Panel({ state, onVoice, listening }: { state: ControlState; onVoice: () => void; listening: boolean }) {
  const slider = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const scheduled = state.driver === "schedule";

  // the slider follows the rack when something else moves it (hold, voice, schedule)
  useEffect(() => {
    const sync = () => {
      if (slider.current && !dragging.current) slider.current.value = String(Math.round(stage.height * 100));
    };
    gsap.ticker.add(sync);
    return () => gsap.ticker.remove(sync);
  }, []);

  return (
    <div className="w-[min(17.5rem,84vw)] rounded-[2.1rem] border border-white/15 bg-[#0c0d11]/85 p-3 text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-4">
      <div aria-hidden className="mx-auto mb-3 h-1 w-14 rounded-full bg-white/20 sm:mb-4" />
      <div className="flex items-baseline justify-between px-1">
        <p className="font-display uppercase text-white/85" style={LABEL}>
          YU ONE
        </p>
        <p className="font-display uppercase text-[#F0765A]" style={LABEL}>
          {scheduled ? `Schedule · ${state.clock}` : "Manual"}
        </p>
      </div>

      <div className="mt-3 rounded-2xl bg-white/[0.06] px-4 py-2.5 sm:mt-4 sm:py-4">
        <div className="flex items-baseline justify-between">
          <label htmlFor="yu-height" className="font-brand text-[13px] text-white">
            Height
          </label>
          <span className="font-brand text-[11px] text-white/45">Ceiling ↔ hand height</span>
        </div>
        <input
          ref={slider}
          id="yu-height"
          type="range"
          min={0}
          max={100}
          defaultValue={100}
          disabled={scheduled}
          onPointerDown={() => (dragging.current = true)}
          onPointerUp={() => (dragging.current = false)}
          onBlur={() => (dragging.current = false)}
          onChange={(e) => {
            stage.height = Number(e.currentTarget.value) / 100;
          }}
          className="yu-range mt-1 w-full sm:mt-3"
        />
      </div>

      <div className="mt-2 space-y-2">
        {SWITCHES.map((s) => (
          <Switch
            key={s.key}
            name={s.name}
            note={s.note}
            on={state[s.key]}
            disabled={scheduled}
            onChange={() => control.set({ [s.key]: !state[s.key] })}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={scheduled}
          onClick={() => {
            stage.height = stage.height > 0.5 ? 0 : 1;
          }}
          className="rounded-2xl bg-[#F0765A] px-3 py-3 font-brand text-[13px] font-semibold text-white transition hover:bg-[#ff8a6e] disabled:opacity-40"
        >
          One press
        </button>
        <button
          type="button"
          disabled={scheduled || listening}
          onClick={onVoice}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.1] px-3 py-3 font-brand text-[13px] text-white transition hover:bg-white/[0.16] disabled:opacity-40"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" strokeLinecap="round" />
          </svg>
          Voice
        </button>
      </div>

      <p className="mt-3 hidden min-h-[2.2em] px-1 font-brand text-[11px] leading-snug text-white/55 sm:block" aria-live="polite">
        {scheduled ? state.note : "Drag, press or speak. The rack on the right follows."}
      </p>
    </div>
  );
}

const DAY_STEPS = [
  { at: "07:30", label: "Lowers for the morning load" },
  { at: "09:00", label: "Flow on" },
  { at: "13:00", label: "Rain. Flow keeps drying" },
  { at: "15:00", label: "UV Glow cycle" },
  { at: "18:30", label: "Rises out of the way" },
  { at: "20:30", label: "Evening light" },
];

/**
 * 03 — Control. Here scroll stops driving and the visitor takes over: the
 * panel, the voice button and press-and-hold all move the real model. Further
 * down, a schedule takes the panel over and runs a whole day.
 */
export function ControlSection() {
  const section = useRef<HTMLElement>(null);
  const state = useControl();
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const voiceTimers = useRef<number[]>([]);

  useEffect(() => {
    const timers = voiceTimers.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const speak = () => {
    if (listening) return;
    const lowering = stage.height < 0.5;
    const phrase = lowering ? "YU, lower the rack." : "YU, raise the rack.";
    setListening(true);
    setHeard("");
    sfx.chime();
    // the words arrive as they would be heard
    for (let i = 1; i <= phrase.length; i++) {
      voiceTimers.current.push(window.setTimeout(() => setHeard(phrase.slice(0, i)), 250 + i * 55));
    }
    const done = 250 + phrase.length * 55;
    voiceTimers.current.push(
      window.setTimeout(() => {
        stage.height = lowering ? 1 : 0;
      }, done + 250),
      window.setTimeout(() => {
        setListening(false);
        setHeard("");
        voiceTimers.current = [];
      }, done + 2600),
    );
  };

  const hold = (on: boolean) => {
    stage.hold = on && control.get().driver === "you";
  };

  useGSAP(
    () => {
      const el = section.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add({ calm: "(prefers-reduced-motion: reduce)", lively: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        const { show, hide } = sectionTimeline(el, !!ctx.conditions?.calm);
        show("[data-beat='hands']", 0.17);
        show("[data-beat='panel']", 0.19);
        show("[data-beat='hold']", 0.22);
        hide("[data-beat='hands']", 0.52);
        hide("[data-beat='hold']", 0.52);
        show("[data-beat='day']", 0.56);
      });
    },
    { scope: section },
  );

  return (
    <section ref={section} id="control" className="relative h-[600svh] text-white" aria-label="Control">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* ---------- press and hold: the right of the screen is the remote ---------- */}
        <div
          data-beat="hold"
          className="invisible absolute inset-y-0 right-0 w-full touch-pan-y select-none opacity-0 md:w-[56vw]"
          onPointerDown={() => hold(true)}
          onPointerUp={() => hold(false)}
          onPointerLeave={() => hold(false)}
          onPointerCancel={() => hold(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <p
            className="absolute bottom-[7svh] right-[6vw] flex items-center gap-3 font-display uppercase text-white/70"
            style={{ ...vf(400, 105), fontSize: "clamp(0.6rem, 0.78vw, 0.82rem)", letterSpacing: "0.28em" }}
          >
            <span aria-hidden className="relative flex size-3">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#F0765A]/60 motion-reduce:hidden" />
              <span className="relative size-3 rounded-full bg-[#F0765A]" />
            </span>
            Press and hold here
          </p>
        </div>

        {/* ---------- copy ---------- */}
        <div data-beat="hands" className="invisible absolute left-[6vw] top-[9svh] max-w-[30rem] opacity-0 md:top-[14svh]">
          <p className="font-display uppercase text-white/85" style={{ ...vf(400, 110), ...EYEBROW }}>
            03 — Control
          </p>
          <span aria-hidden className="mt-4 hidden h-px w-12 bg-white/60 md:block" />
          <h2 className="mt-3 font-display text-[#efe7da] md:mt-6" style={{ ...TITLE, fontSize: "clamp(1.5rem, 3.2vw, 3.4rem)" }}>
            App, voice, <br className="hidden md:block" />
            or one press.
          </h2>
          <p className="mt-4 hidden font-brand text-white/75 md:block" style={BODY}>
            This panel is live. Whatever you set, the unit does.
          </p>
        </div>

        <div data-beat="day" className="invisible absolute left-[6vw] top-[9svh] max-w-[30rem] opacity-0 md:top-[14svh]">
          <p className="font-display uppercase text-white/85" style={{ ...vf(400, 110), ...EYEBROW }}>
            Or set a schedule
          </p>
          <span aria-hidden className="mt-4 hidden h-px w-12 bg-white/60 md:block" />
          <p
            className="mt-2 font-display tabular-nums text-[#efe7da] md:mt-5"
            style={{ ...vf(200, 100), fontSize: "clamp(2.2rem, 6vw, 6.5rem)", lineHeight: 0.95 }}
          >
            {state.clock || "07:00"}
          </p>
          <p className="mt-2 font-brand text-white/75" style={BODY}>
            {state.note || "A whole day, in one scroll."}
          </p>
        </div>

        {/* ---------- the panel ---------- */}
        <div
          data-beat="panel"
          className="invisible absolute bottom-[3svh] left-1/2 -translate-x-1/2 opacity-0 md:bottom-[6svh] md:left-[6vw] md:translate-x-0"
        >
          <div className="flex items-end gap-6">
            <Panel state={state} onVoice={speak} listening={listening} />
            <ol className="hidden pb-4 xl:block" aria-label="Schedule">
              {DAY_STEPS.map((step) => {
                const past = state.driver === "schedule" && state.clock >= step.at;
                return (
                  <li
                    key={step.at}
                    className={`flex items-baseline gap-3 py-1.5 font-brand text-[12px] transition-opacity ${past ? "opacity-100" : "opacity-35"}`}
                  >
                    <span className="font-display tabular-nums text-[#F0765A]" style={LABEL}>
                      {step.at}
                    </span>
                    {step.label}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* ---------- voice ---------- */}
        <div
          className={`pointer-events-none absolute left-1/2 top-[9svh] flex -translate-x-1/2 flex-col items-center transition-opacity duration-500 md:left-[64vw] ${listening ? "opacity-100" : "opacity-0"}`}
          aria-live="polite"
        >
          <div aria-hidden className="flex h-8 items-center gap-1">
            {Array.from({ length: 17 }, (_, i) => (
              <span
                key={i}
                className="yu-wave block w-0.5 rounded-full bg-[#F0765A]"
                style={{ animationDelay: `${-i * 0.09}s`, height: `${30 + ((i * 37) % 70)}%` }}
              />
            ))}
          </div>
          <p
            className="mt-3 min-h-[1.4em] whitespace-nowrap font-display text-[#efe7da]"
            style={{ ...vf(300, 100), fontSize: "clamp(1.1rem, 1.8vw, 1.9rem)" }}
          >
            {heard ? `“${heard}”` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
