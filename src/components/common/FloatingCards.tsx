import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Rank, RANKS, Suit, SUITS, SUIT_THEME } from '../../types';
import SuitIcon from './SuitIcon';

interface CardConfig {
  id: number;
  initialRank: Rank;
  initialSuit: Suit;
  top: string;
  left: string;
  rot: number;
  width: number;
  depth: number;
  floatDuration: number;
  floatDelay: number;
  flipInterval: number;
  flipDelay: number;
}

interface Star {
  id: number;
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  sparkle?: boolean;
}

const HIGH_RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];

function pickNextCard(current: { rank: Rank; suit: Suit }): { rank: Rank; suit: Suit } {
  let nextRank: Rank;
  let nextSuit: Suit;
  let attempts = 0;
  do {
    const pool = Math.random() < 0.72 ? HIGH_RANKS : RANKS;
    nextRank = pool[Math.floor(Math.random() * pool.length)];
    nextSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
    attempts++;
  } while (nextRank === current.rank && nextSuit === current.suit && attempts < 10);

  return { rank: nextRank, suit: nextSuit };
}

// ---------------------------------------------------------
// DESKTOP: 14 cards (5 left, 5 right, 2 upper, 2 bottom)
// Organically staggered, open and non-congested center
// ---------------------------------------------------------
const DESKTOP_CARDS: CardConfig[] = [
  // --- LEFT SIDE (5 cards staggered in a wave) ---
  {
    id: 1,
    initialRank: 'A',
    initialSuit: 'spades',
    top: '8%',
    left: '5%',
    rot: -15,
    width: 50,
    depth: 1.0,
    floatDuration: 6.2,
    floatDelay: 0,
    flipInterval: 8.5,
    flipDelay: 1.5,
  },
  {
    id: 2,
    initialRank: 'K',
    initialSuit: 'hearts',
    top: '23%',
    left: '17%',
    rot: 12,
    width: 48,
    depth: 0.9,
    floatDuration: 6.8,
    floatDelay: 0.8,
    flipInterval: 9.2,
    flipDelay: 4.0,
  },
  {
    id: 3,
    initialRank: 'Q',
    initialSuit: 'clubs',
    top: '47%',
    left: '4%',
    rot: -18,
    width: 50,
    depth: 1.0,
    floatDuration: 6.4,
    floatDelay: 1.4,
    flipInterval: 8.0,
    flipDelay: 6.2,
  },
  {
    id: 4,
    initialRank: 'J',
    initialSuit: 'diamonds',
    top: '71%',
    left: '16%',
    rot: 11,
    width: 48,
    depth: 0.9,
    floatDuration: 6.6,
    floatDelay: 0.5,
    flipInterval: 9.8,
    flipDelay: 2.8,
  },
  {
    id: 5,
    initialRank: '10',
    initialSuit: 'spades',
    top: '86%',
    left: '6%',
    rot: -10,
    width: 50,
    depth: 1.0,
    floatDuration: 6.0,
    floatDelay: 1.8,
    flipInterval: 8.8,
    flipDelay: 7.5,
  },

  // --- RIGHT SIDE (5 cards staggered in a wave) ---
  {
    id: 6,
    initialRank: 'A',
    initialSuit: 'hearts',
    top: '9%',
    left: '88%',
    rot: 14,
    width: 50,
    depth: 1.0,
    floatDuration: 6.5,
    floatDelay: 0.3,
    flipInterval: 8.6,
    flipDelay: 2.2,
  },
  {
    id: 7,
    initialRank: 'K',
    initialSuit: 'diamonds',
    top: '25%',
    left: '77%',
    rot: -12,
    width: 48,
    depth: 0.9,
    floatDuration: 7.0,
    floatDelay: 1.1,
    flipInterval: 9.5,
    flipDelay: 5.0,
  },
  {
    id: 8,
    initialRank: 'Q',
    initialSuit: 'spades',
    top: '49%',
    left: '91%',
    rot: 16,
    width: 50,
    depth: 1.0,
    floatDuration: 6.3,
    floatDelay: 1.6,
    flipInterval: 8.2,
    flipDelay: 3.2,
  },
  {
    id: 9,
    initialRank: 'J',
    initialSuit: 'clubs',
    top: '70%',
    left: '78%',
    rot: -9,
    width: 48,
    depth: 0.9,
    floatDuration: 6.7,
    floatDelay: 0.9,
    flipInterval: 9.0,
    flipDelay: 6.8,
  },
  {
    id: 10,
    initialRank: '10',
    initialSuit: 'diamonds',
    top: '87%',
    left: '87%',
    rot: 12,
    width: 50,
    depth: 1.0,
    floatDuration: 6.1,
    floatDelay: 2.0,
    flipInterval: 8.4,
    flipDelay: 1.0,
  },

  // --- UPPER (2 cards framing the top) ---
  {
    id: 11,
    initialRank: '7',
    initialSuit: 'spades',
    top: '6%',
    left: '34%',
    rot: -8,
    width: 48,
    depth: 0.9,
    floatDuration: 6.9,
    floatDelay: 0.6,
    flipInterval: 9.4,
    flipDelay: 3.6,
  },
  {
    id: 12,
    initialRank: '9',
    initialSuit: 'hearts',
    top: '7%',
    left: '64%',
    rot: 10,
    width: 48,
    depth: 0.9,
    floatDuration: 6.5,
    floatDelay: 1.5,
    flipInterval: 8.7,
    flipDelay: 5.8,
  },

  // --- BOTTOM (2 cards framing the bottom) ---
  {
    id: 13,
    initialRank: '8',
    initialSuit: 'diamonds',
    top: '88%',
    left: '33%',
    rot: 7,
    width: 48,
    depth: 0.9,
    floatDuration: 6.7,
    floatDelay: 0.9,
    flipInterval: 9.1,
    flipDelay: 2.5,
  },
  {
    id: 14,
    initialRank: 'Q',
    initialSuit: 'hearts',
    top: '87%',
    left: '65%',
    rot: -9,
    width: 48,
    depth: 0.9,
    floatDuration: 6.3,
    floatDelay: 1.8,
    flipInterval: 8.3,
    flipDelay: 4.8,
  },
];

// ---------------------------------------------------------
// DESKTOP GALAXY STARS: Subtle, elegant, non-congested
// ---------------------------------------------------------
const GALAXY_STARS: Star[] = [
  { id: 1, top: '4%', left: '12%', size: 1.5, duration: 3.8, delay: 0.2, opacity: 0.7 },
  { id: 2, top: '9%', left: '22%', size: 2.2, duration: 4.5, delay: 1.1, opacity: 0.85, sparkle: true },
  { id: 3, top: '15%', left: '42%', size: 1.2, duration: 3.2, delay: 2.4, opacity: 0.6 },
  { id: 4, top: '8%', left: '55%', size: 1.8, duration: 5.1, delay: 0.8, opacity: 0.75 },
  { id: 5, top: '14%', left: '74%', size: 1.2, duration: 4.0, delay: 1.7, opacity: 0.65 },
  { id: 6, top: '5%', left: '82%', size: 2.0, duration: 4.8, delay: 2.9, opacity: 0.8, sparkle: true },
  { id: 7, top: '18%', left: '94%', size: 1.5, duration: 3.6, delay: 0.5, opacity: 0.7 },
  { id: 8, top: '25%', left: '10%', size: 1.2, duration: 4.2, delay: 1.9, opacity: 0.6 },
  { id: 9, top: '32%', left: '24%', size: 1.8, duration: 5.0, delay: 0.3, opacity: 0.75 },
  { id: 10, top: '38%', left: '15%', size: 1.0, duration: 3.5, delay: 2.1, opacity: 0.5 },
  { id: 11, top: '44%', left: '28%', size: 2.2, duration: 4.6, delay: 1.4, opacity: 0.85, sparkle: true },
  { id: 12, top: '52%', left: '8%', size: 1.5, duration: 3.9, delay: 0.7, opacity: 0.65 },
  { id: 13, top: '60%', left: '20%', size: 1.2, duration: 4.4, delay: 2.6, opacity: 0.6 },
  { id: 14, top: '65%', left: '12%', size: 1.8, duration: 5.2, delay: 1.0, opacity: 0.75 },
  { id: 15, top: '75%', left: '25%', size: 1.5, duration: 3.7, delay: 2.0, opacity: 0.7 },
  { id: 16, top: '82%', left: '14%', size: 2.0, duration: 4.9, delay: 0.4, opacity: 0.8, sparkle: true },
  { id: 17, top: '92%', left: '8%', size: 1.2, duration: 3.4, delay: 1.6, opacity: 0.6 },
  { id: 18, top: '94%', left: '22%', size: 1.6, duration: 4.7, delay: 2.8, opacity: 0.7 },
  { id: 19, top: '80%', left: '44%', size: 1.2, duration: 3.8, delay: 0.9, opacity: 0.55 },
  { id: 20, top: '93%', left: '50%', size: 2.2, duration: 5.0, delay: 1.8, opacity: 0.85, sparkle: true },
  { id: 21, top: '82%', left: '58%', size: 1.5, duration: 4.1, delay: 2.5, opacity: 0.65 },
  { id: 22, top: '90%', left: '72%', size: 1.8, duration: 4.6, delay: 0.2, opacity: 0.75 },
  { id: 23, top: '78%', left: '82%', size: 1.2, duration: 3.3, delay: 1.5, opacity: 0.6 },
  { id: 24, top: '92%', left: '92%', size: 2.0, duration: 4.8, delay: 2.7, opacity: 0.8, sparkle: true },
  { id: 25, top: '62%', left: '85%', size: 1.5, duration: 3.9, delay: 0.6, opacity: 0.7 },
  { id: 26, top: '56%', left: '75%', size: 1.2, duration: 4.3, delay: 2.2, opacity: 0.6 },
  { id: 27, top: '45%', left: '84%', size: 2.2, duration: 5.3, delay: 1.3, opacity: 0.85, sparkle: true },
  { id: 28, top: '35%', left: '78%', size: 1.5, duration: 3.6, delay: 0.8, opacity: 0.65 },
  { id: 29, top: '28%', left: '88%', size: 1.8, duration: 4.5, delay: 2.0, opacity: 0.75 },
  { id: 30, top: '22%', left: '68%', size: 1.2, duration: 3.5, delay: 1.2, opacity: 0.55 },
  { id: 31, top: '12%', left: '30%', size: 1.5, duration: 4.0, delay: 2.3, opacity: 0.7 },
  { id: 32, top: '3%', left: '48%', size: 2.0, duration: 4.7, delay: 0.5, opacity: 0.8, sparkle: true },
  { id: 33, top: '16%', left: '60%', size: 1.2, duration: 3.4, delay: 1.8, opacity: 0.6 },
  { id: 34, top: '30%', left: '38%', size: 1.0, duration: 4.2, delay: 2.9, opacity: 0.5 },
  { id: 35, top: '68%', left: '36%', size: 1.2, duration: 3.7, delay: 1.1, opacity: 0.55 },
  { id: 36, top: '72%', left: '62%', size: 1.5, duration: 4.4, delay: 0.4, opacity: 0.65 },
  { id: 37, top: '26%', left: '3%', size: 1.8, duration: 5.1, delay: 2.1, opacity: 0.75 },
  { id: 38, top: '37%', left: '96%', size: 1.2, duration: 3.8, delay: 1.6, opacity: 0.6 },
  { id: 39, top: '58%', left: '95%', size: 2.0, duration: 4.9, delay: 0.7, opacity: 0.8, sparkle: true },
  { id: 40, top: '85%', left: '3%', size: 1.5, duration: 3.5, delay: 2.4, opacity: 0.65 },
];

// ---------------------------------------------------------
// MOBILE / OLDER CARDS: Preserved exactly as the original
// ---------------------------------------------------------
const OLDER_MOBILE_CARDS = [
  { label: 'A♠', color: '#0f172a', top: '8%', left: '6%', rot: -14, delay: 0, size: 64 },
  { label: 'K♥', color: '#e11d48', top: '14%', left: '84%', rot: 12, delay: 0.6, size: 74 },
  { label: 'Q♣', color: '#0f172a', top: '68%', left: '4%', rot: 18, delay: 1.1, size: 58 },
  { label: 'J♦', color: '#e11d48', top: '76%', left: '88%', rot: -10, delay: 0.3, size: 60 },
  { label: '10♠', color: '#0f172a', top: '40%', left: '92%', rot: 8, delay: 1.6, size: 50 },
  { label: '7♥', color: '#e11d48', top: '86%', left: '30%', rot: -6, delay: 0.9, size: 46 },
];

function DynamicCardItem({
  config,
  mouseOffset,
}: {
  config: CardConfig;
  mouseOffset: { x: number; y: number };
}) {
  const [card, setCard] = useState<{ rank: Rank; suit: Suit }>({
    rank: config.initialRank,
    suit: config.initialSuit,
  });
  const [flipAngle, setFlipAngle] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let changeTimeout: ReturnType<typeof setTimeout> | undefined;
    let flipTimeout: ReturnType<typeof setTimeout> | undefined;

    const triggerFlip = () => {
      setIsFlipping(true);
      setFlipAngle((prev) => prev + 360);

      // Mid-flip (700ms into 1400ms gentle spin): card back is facing camera
      changeTimeout = setTimeout(() => {
        setCard((prev) => pickNextCard(prev));
      }, 700);

      // Spin complete (1400ms duration)
      flipTimeout = setTimeout(() => {
        setIsFlipping(false);
      }, 1420);
    };

    const initialTimeout = setTimeout(() => {
      triggerFlip();
      intervalId = setInterval(triggerFlip, config.flipInterval * 1000);
    }, config.flipDelay * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalId) clearInterval(intervalId);
      if (changeTimeout) clearTimeout(changeTimeout);
      if (flipTimeout) clearTimeout(flipTimeout);
    };
  }, [config.flipDelay, config.flipInterval]);

  const theme = SUIT_THEME[card.suit];
  const cardHeight = Math.round(config.width * 1.38);

  return (
    <div
      style={{
        top: config.top,
        left: config.left,
        transform: `translate3d(${mouseOffset.x * config.depth}px, ${mouseOffset.y * config.depth}px, 0)`,
        transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
        zIndex: isFlipping ? 20 : 10,
      }}
      className="absolute pointer-events-none select-none"
    >
      {/* Gentle ambient floating bob & tilt */}
      <motion.div
        animate={{
          y: [-5 * config.depth, 5 * config.depth, -5 * config.depth],
          rotateZ: [config.rot - 2, config.rot + 2, config.rot - 2],
        }}
        transition={{
          duration: config.floatDuration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: config.floatDelay,
        }}
      >
        {/* 3D Perspective Flip Container */}
        <div
          style={{
            perspective: '1000px',
            width: `${config.width}px`,
            height: `${cardHeight}px`,
          }}
          className="relative"
        >
          <motion.div
            animate={{
              rotateY: flipAngle,
              scale: isFlipping ? 1.08 : 1,
            }}
            transition={{
              // Slower, smoother, more relaxing rotation
              duration: 1.4,
              ease: [0.35, 0, 0.25, 1],
            }}
            style={{
              transformStyle: 'preserve-3d',
              width: '100%',
              height: '100%',
              position: 'relative',
            }}
          >
            {/* FRONT FACE - Clean card with Rank and ONLY ONE suit symbol */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                boxShadow: isFlipping
                  ? `0 12px 24px -4px rgba(0,0,0,0.55), 0 0 20px 2px ${theme.hex}44`
                  : `0 8px 18px -4px rgba(0,0,0,0.4), 0 0 10px 0px ${theme.hex}20`,
                opacity: 0.94,
              }}
              className="absolute inset-0 rounded-lg sm:rounded-xl bg-white border border-white/90 overflow-hidden flex flex-col items-center justify-center select-none shadow-md transition-shadow duration-300"
            >
              {/* Glossy subtle sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none rounded-lg sm:rounded-xl" />

              {/* Card Face: Rank + ONLY ONE Symbol */}
              <div className={`relative z-10 flex flex-col items-center justify-center ${theme.textClass}`}>
                <span className="font-display font-black text-sm sm:text-base leading-none tracking-tight">
                  {card.rank}
                </span>
                <SuitIcon
                  suit={card.suit}
                  size={config.width > 50 ? 17 : 15}
                  className="mt-0.5"
                />
              </div>
            </div>

            {/* BACK FACE - Compact luxury card back */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                boxShadow: '0 10px 20px -4px rgba(0,0,0,0.55), 0 0 14px rgba(56,189,248,0.25)',
              }}
              className="absolute inset-0 rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-[#070a18] via-[#101736] to-[#050713] p-1 flex items-center justify-center border border-cyan-500/40"
            >
              <div className="w-full h-full rounded-md border border-amber-400/35 flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/80 via-slate-950 to-black">
                {/* Micro geometric diamond pattern */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#fbbf24 1px, transparent 1px)`,
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 4px 4px',
                  }}
                />

                {/* Central ACE Crest */}
                <div className="relative z-10 w-7 h-7 rounded-full border border-amber-400/50 shadow-[0_0_8px_rgba(56,189,248,0.3)] flex flex-col items-center justify-center bg-black/70">
                  <span className="text-[6px] font-black tracking-widest text-amber-300 leading-none">
                    ACE
                  </span>
                  <span className="text-[9px] font-black text-cyan-400 leading-none mt-0.5">♠</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default function FloatingCards() {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Interactive 3D mouse parallax on desktop
  useEffect(() => {
    let frameId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetX = (e.clientX / innerWidth - 0.5) * 2;
      targetY = (e.clientY / innerHeight - 0.5) * 2;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      setMouseOffset({ x: currentX * 10, y: currentY * 10 });
      frameId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    frameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <>
      {/* 1. MOBILE VIEW: EXACTLY AS OLDER VERSION (< md / < 768px) */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden hidden sm:block md:hidden select-none z-0"
        aria-hidden="true"
      >
        {OLDER_MOBILE_CARDS.map((c, i) => (
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

      {/* 2. DESKTOP VIEW ONLY (>= md / >= 768px): Cards Galaxy with subtle stars & 3D cards */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0 hidden md:block"
        aria-hidden="true"
      >
        {/* Soft cosmic nebula auras - deep, serene, non-congested */}
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[380px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[15%] w-[550px] h-[400px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-[45%] left-[-5%] w-[400px] h-[400px] bg-indigo-500/08 rounded-full blur-[130px] pointer-events-none" />

        {/* Faint distant shooting star (occurs once every ~14s) */}
        <motion.div
          animate={{
            x: ['-5%', '130%'],
            y: ['0%', '70%'],
            opacity: [0, 0.7, 0.7, 0],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            repeatDelay: 13,
            ease: 'easeOut',
            delay: 4,
          }}
          className="absolute top-4 left-10 w-20 h-[1px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent -rotate-25 pointer-events-none blur-[0.3px]"
        />

        {/* Twinkling galaxy starfield - slightly brighter and luminous */}
        {GALAXY_STARS.map((s) => (
          <motion.div
            key={s.id}
            style={{
              top: s.top,
              left: s.left,
              width: `${s.size}px`,
              height: `${s.size}px`,
            }}
            animate={{
              opacity: [s.opacity * 0.55, Math.min(1, s.opacity * 1.3), s.opacity * 0.55],
              scale: s.sparkle ? [0.9, 1.4, 0.9] : [0.95, 1.15, 0.95],
            }}
            transition={{
              duration: s.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: s.delay,
            }}
            className={`absolute rounded-full pointer-events-none ${
              s.sparkle
                ? 'bg-white shadow-[0_0_8px_rgba(56,189,248,1),0_0_3px_#fff]'
                : 'bg-white shadow-[0_0_5px_rgba(255,255,255,0.9),0_0_2px_rgba(56,189,248,0.5)]'
            }`}
          >
            {s.sparkle && (
              <div className="absolute -inset-1.5 flex items-center justify-center pointer-events-none opacity-65">
                <div className="w-3 h-[0.75px] bg-cyan-200 shadow-[0_0_4px_rgba(56,189,248,0.8)]" />
                <div className="h-3 w-[0.75px] bg-cyan-200 shadow-[0_0_4px_rgba(56,189,248,0.8)] absolute" />
              </div>
            )}
          </motion.div>
        ))}

        {/* Celestial Cards Galaxy - Desktop Floating & Flipping Cards */}
        {DESKTOP_CARDS.map((config) => (
          <DynamicCardItem key={config.id} config={config} mouseOffset={mouseOffset} />
        ))}
      </div>
    </>
  );
}
