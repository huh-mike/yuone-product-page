"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { vf } from "./beats";
import { rig } from "./rig";
import { sfx } from "./sound";
import { SECTIONS, STORE_URL, pageT } from "./stage";

gsap.registerPlugin(useGSAP);

const TRAVEL = 118; // px the miniature rack lowers from the top of the page to the bottom

/**
 * Fixed furniture: a miniature of the unit whose rack height is how far down
 * the page you are, and the sound switch.
 */
export function Hud() {
  const root = useRef<HTMLDivElement>(null);
  const [sound, setSound] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const rack = q("[data-mini-rack]")[0] as HTMLElement | undefined;
      const lift = q("[data-mini-lift]")[0] as HTMLElement | undefined;
      const marks = q("[data-mark]") as HTMLElement[];
      const fade = q("[data-fade]")[0] as HTMLElement | undefined;

      const paint = () => {
        const t = pageT();
        const y = (t / SECTIONS.length) * TRAVEL;
        if (rack) rack.style.transform = `translateY(${y.toFixed(1)}px)`;
        if (lift) lift.style.height = `${(y + 6).toFixed(1)}px`;
        const current = Math.min(SECTIONS.length - 1, Math.floor(t));
        marks.forEach((m, i) => m.toggleAttribute("data-current", i === current));
        // dark ink on the drawing board, light everywhere else
        el.style.color = rig.backdrop.paper > 0.5 ? "#222222" : "#efe7da";
        // the furniture stays out of the way of the hero until the reader starts moving; the cart never hides
        if (fade) fade.style.opacity = String(Math.min(1, t * 6));
      };
      gsap.ticker.add(paint);
      return () => gsap.ticker.remove(paint);
    },
    { scope: root },
  );

  const toggle = () => {
    const on = !sound;
    setSound(on);
    void sfx.enable(on);
  };

  return (
    <div ref={root} className="pointer-events-none fixed inset-0 z-40 transition-colors duration-500">
      {/* ---------- buy: always within reach ---------- */}
      <a
        href={STORE_URL}
        className="pointer-events-auto absolute right-4 top-[4.5rem] inline-flex items-center gap-2 rounded-full bg-[#F0765A] px-4 py-2 font-brand text-[13px] font-semibold text-white shadow-[0_12px_32px_rgba(240,118,90,0.35)] transition hover:bg-[#ff8a6e] md:right-[6vw] md:px-5 md:py-2.5"
      >
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
          <path d="M4.5 7.5h15l-1.2 12.2a1.4 1.4 0 0 1-1.4 1.3H7.1a1.4 1.4 0 0 1-1.4-1.3L4.5 7.5Z" strokeLinejoin="round" />
          <path d="M8.7 9.6V6.4a3.3 3.3 0 0 1 6.6 0v3.2" strokeLinecap="round" />
        </svg>
        Buy now
      </a>

      <div data-fade className="absolute inset-0 opacity-0">
      {/* ---------- miniature rack: page progress ---------- */}
      <nav
        aria-label="Sections"
        className="pointer-events-auto absolute right-[1.6vw] top-1/2 hidden -translate-y-1/2 flex-col items-center md:flex"
      >
        <span aria-hidden className="block h-2 w-9 rounded-full border border-current opacity-80" />
        <div className="relative w-9" style={{ height: TRAVEL + 14 }}>
          <span data-mini-lift aria-hidden className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-current opacity-40" />
          <span data-mini-rack aria-hidden className="absolute inset-x-0 top-1.5 block will-change-transform">
            <span className="block h-0.5 w-full rounded-full bg-[#F0765A]" />
            <span className="mt-1 block h-px w-full bg-current opacity-60" />
          </span>
          <ol className="absolute inset-0">
            {SECTIONS.map((s, i) => (
              <li key={s.id} className="absolute right-full" style={{ top: (i / SECTIONS.length) * TRAVEL + 3 }}>
                <a
                  data-mark
                  href={`#${s.id}`}
                  className="group flex items-center gap-2 pr-2 font-display uppercase opacity-40 transition-opacity hover:opacity-100 data-[current]:opacity-100"
                  style={{ ...vf(400, 105), fontSize: "0.56rem", letterSpacing: "0.26em" }}
                >
                  <span className="hidden whitespace-nowrap group-hover:inline group-data-[current]:inline">{s.label}</span>
                  <span aria-hidden className="block h-px w-2 bg-current" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* ---------- sound ---------- */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={sound}
        className="pointer-events-auto absolute bottom-[3svh] right-4 flex items-center gap-2 font-display uppercase opacity-70 transition-opacity hover:opacity-100 md:right-[1.6vw]"
        style={{ ...vf(400, 105), fontSize: "0.6rem", letterSpacing: "0.26em" }}
      >
        <span aria-hidden className="flex h-3 items-end gap-[2px]">
          {[0.5, 1, 0.7, 0.35].map((h, i) => (
            <span
              key={i}
              className={`block w-[2px] origin-bottom rounded-full bg-current ${sound ? "yu-wave" : ""}`}
              style={{ height: `${h * 100}%`, animationDelay: `${-i * 0.17}s` }}
            />
          ))}
        </span>
        Sound {sound ? "on" : "off"}
      </button>
      </div>
    </div>
  );
}
