const SECTIONS = [
  { id: "modules", eyebrow: "01 — Modules", title: "Solo. Duo. Flex.", tone: "cream" },
  { id: "care", eyebrow: "02 — Care", title: "Flow airflow & UV Glow.", tone: "white" },
  { id: "control", eyebrow: "03 — Control", title: "App, voice, or one press.", tone: "cream" },
  { id: "build", eyebrow: "04 — Build", title: "Build the rack that fits you.", tone: "ink" },
] as const;

/**
 * Blank stand-ins for the sections below the hero, so the scroll rhythm of
 * the full page can be felt before the real content exists.
 */
export function PlaceholderSections() {
  return (
    <>
      {SECTIONS.map((s) => (
        <section
          key={s.id}
          id={s.id}
          className={[
            "flex min-h-svh flex-col justify-between px-[6vw] py-[8svh]",
            s.tone === "cream" && "bg-[#efe7da] text-[#222]",
            s.tone === "white" && "bg-white text-[#222]",
            s.tone === "ink" && "bg-[#0a0b0e] text-[#efe7da]",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="font-display text-[11px] uppercase tracking-[0.36em] opacity-70">{s.eyebrow}</p>
          <div
            className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-current/25 my-10"
            aria-hidden
          >
            <span className="font-display text-[11px] uppercase tracking-[0.3em] opacity-45">
              Section placeholder
            </span>
          </div>
          <h2
            className="font-display"
            style={{
              fontVariationSettings: '"wght" 200, "wdth" 100',
              fontWeight: 200,
              fontSize: "clamp(2rem, 4.5vw, 4.5rem)",
              lineHeight: 1,
            }}
          >
            {s.title}
          </h2>
        </section>
      ))}
    </>
  );
}
