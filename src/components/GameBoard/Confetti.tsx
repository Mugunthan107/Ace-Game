import { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#EC4899', '#38BDF8', '#2563EB', '#22C55E', '#F59E0B', '#A855F7'];

function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r1 = pseudoRandom(i * 1.3 + 0.1);
        const r2 = pseudoRandom(i * 2.7 + 0.2);
        const r3 = pseudoRandom(i * 4.1 + 0.3);
        const r4 = pseudoRandom(i * 5.9 + 0.4);
        const r5 = pseudoRandom(i * 7.3 + 0.5);
        return {
          id: i,
          left: r1 * 100,
          delay: r2 * 0.6,
          duration: 2.2 + r3 * 1.4,
          color: COLORS[i % COLORS.length],
          rotate: r4 * 360,
          drift: (r5 - 0.5) * 120,
          size: 6 + r2 * 6,
        };
      }),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ top: '-5%', left: `${p.left}%`, opacity: 1, rotate: 0 }}
          animate={{ top: '110%', left: `${p.left + p.drift / 10}%`, opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size * 1.6, background: p.color }}
        />
      ))}
    </div>
  );
}
