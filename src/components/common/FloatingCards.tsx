const CARDS: { label: string; color: string; top: string; left: string; rot: number; delay: number; size: number }[] = [
  { label: 'A♠', color: '#0f172a', top: '8%', left: '6%', rot: -14, delay: 0, size: 64 },
  { label: 'K♥', color: '#e11d48', top: '14%', left: '84%', rot: 12, delay: 0.6, size: 74 },
  { label: 'Q♣', color: '#0f172a', top: '68%', left: '4%', rot: 18, delay: 1.1, size: 58 },
  { label: 'J♦', color: '#e11d48', top: '76%', left: '88%', rot: -10, delay: 0.3, size: 60 },
  { label: '10♠', color: '#0f172a', top: '40%', left: '92%', rot: 8, delay: 1.6, size: 50 },
  { label: '7♥', color: '#e11d48', top: '86%', left: '30%', rot: -6, delay: 0.9, size: 46 },
];

export default function FloatingCards() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden hidden sm:block" aria-hidden="true">
      {CARDS.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-xl bg-white shadow-xl shadow-black/40 flex items-center justify-center font-display font-extrabold animate-float"
          style={{
            top: c.top,
            left: c.left,
            width: c.size,
            height: c.size * 1.38,
            color: c.color,
            fontSize: c.size * 0.3,
            transform: `rotate(${c.rot}deg)`,
            animationDelay: `${c.delay}s`,
            // @ts-expect-error custom css var for rotation in keyframes
            '--rot': `${c.rot}deg`,
            opacity: 0.92,
          }}
        >
          {c.label}
        </div>
      ))}
    </div>
  );
}
