"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const HOVER_TARGETS = "a, button, [role='button'], input, textarea, select, label";

/**
 * Custom cursor: a warm dot that tracks the pointer tightly and a thin ring
 * that follows with lag and breathes. The ring swells over interactive
 * elements and contracts on press. Only mounts for fine pointers; touch
 * devices and reduced-motion users keep the native cursor.
 */
export function CustomCursor() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const dot = el.querySelector<HTMLElement>("[data-dot]")!;
        const ring = el.querySelector<HTMLElement>("[data-ring]")!;
        document.documentElement.classList.add("has-custom-cursor");

        gsap.set([dot, ring], { xPercent: -50, yPercent: -50, autoAlpha: 0 });

        const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3.out" });
        const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3.out" });
        const ringX = gsap.quickTo(ring, "x", { duration: 0.5, ease: "power3.out" });
        const ringY = gsap.quickTo(ring, "y", { duration: 0.5, ease: "power3.out" });

        // idle breathing on the ring
        const breathe = gsap.to(ring, {
          scale: 1.12,
          duration: 1.8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        let shown = false;
        let hovering = false;

        const setState = (opts: { hover?: boolean; down?: boolean }) => {
          if (opts.hover !== undefined) hovering = opts.hover;
          const down = opts.down ?? false;
          if (hovering || down) breathe.pause();
          else breathe.resume();
          gsap.to(ring, {
            scale: down ? 0.8 : hovering ? 1.7 : 1,
            borderColor: hovering ? "rgba(240,118,90,0.9)" : "rgba(255,255,255,0.75)",
            backgroundColor: hovering ? "rgba(240,118,90,0.14)" : "rgba(255,255,255,0)",
            duration: 0.35,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(dot, { scale: down ? 0.6 : hovering ? 0.5 : 1, duration: 0.25, overwrite: "auto" });
        };

        const onMove = (e: PointerEvent) => {
          dotX(e.clientX);
          dotY(e.clientY);
          ringX(e.clientX);
          ringY(e.clientY);
          if (!shown) {
            shown = true;
            gsap.to([dot, ring], { autoAlpha: 1, duration: 0.4 });
          }
          const overTarget = !!(e.target as Element | null)?.closest?.(HOVER_TARGETS);
          if (overTarget !== hovering) setState({ hover: overTarget });
        };
        const onDown = () => setState({ down: true });
        const onUp = () => setState({ down: false });
        const onLeave = () => gsap.to([dot, ring], { autoAlpha: 0, duration: 0.3 });
        const onEnter = () => shown && gsap.to([dot, ring], { autoAlpha: 1, duration: 0.3 });

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onDown);
        window.addEventListener("pointerup", onUp);
        document.documentElement.addEventListener("pointerleave", onLeave);
        document.documentElement.addEventListener("pointerenter", onEnter);

        return () => {
          document.documentElement.classList.remove("has-custom-cursor");
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerdown", onDown);
          window.removeEventListener("pointerup", onUp);
          document.documentElement.removeEventListener("pointerleave", onLeave);
          document.documentElement.removeEventListener("pointerenter", onEnter);
          breathe.kill();
        };
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-[100] hidden [.has-custom-cursor_&]:block">
      <span
        data-ring
        className="absolute left-0 top-0 size-10 rounded-full border border-white/75 mix-blend-difference"
      />
      <span
        data-dot
        className="absolute left-0 top-0 size-[6px] rounded-full bg-[#F0765A]"
        style={{ boxShadow: "0 0 12px 2px rgba(240,118,90,0.55)" }}
      />
    </div>
  );
}
