/**
 * Deterministic speck field for the hero backdrop.
 * Seeded so server and client render identical markup (no hydration drift).
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Starfield({ count = 120 }: { count?: number }) {
  const rand = mulberry32(20250901);
  const specks = Array.from({ length: count }, () => {
    const warm = rand() > 0.82;
    return {
      left: rand() * 100,
      top: rand() * 100,
      size: 0.7 + rand() * 1.6,
      opacity: 0.12 + rand() * 0.45,
      warm,
    };
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {specks.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            background: s.warm ? "#F0765A" : "#ffffff",
          }}
        />
      ))}
    </div>
  );
}
