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

interface SyncStar {
  id: number;
  top: string;
  left: string;
  size: number;
  phase: number;
  isHero?: boolean;
}

interface AmbientStar {
  id: number;
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
  maxOpacity: number;
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
// SYNCHRONIZED CELESTIAL CONSTELLATION:
// Exactly 8 phased beacons that hand off the sparkle wave
// across the night sky in a mathematically synchronized relay.
// ---------------------------------------------------------
// SYNCHRONIZED CELESTIAL CONSTELLATION:
// Exactly 8 phased beacons that hand off the sparkle wave
// across the night sky in a mathematically synchronized relay.
// When one dims low, the next star in another region peaks!
// ---------------------------------------------------------
const SYNC_CYCLE_DURATION = 8.0; // 8 seconds per complete cosmic orbit

const ASTROID_STAR_PATH =
  'M12 0 C12 6.8 17.2 12 24 12 C17.2 12 12 17.2 12 24 C12 17.2 6.8 12 0 12 C6.8 12 12 6.8 12 0 Z';

function CelestialStarSvg({
  size = 20,
  isHero = false,
  color = '#ffffff',
  glowColor = 'rgba(56,189,248,0.9)',
}: {
  size: number;
  isHero?: boolean;
  color?: string;
  glowColor?: string;
}) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      className="relative flex items-center justify-center select-none pointer-events-none"
    >
      {/* 4-Point Primary Star Shape */}
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full"
        style={{
          filter: `drop-shadow(0 0 ${Math.max(3, size * 0.35)}px ${glowColor})`,
        }}
      >
        <path d={ASTROID_STAR_PATH} fill={color} />
      </svg>

      {/* 8-Point Secondary Star (45-degree rotated diamond arms for Hero Stars) */}
      {isHero && (
        <svg
          viewBox="0 0 24 24"
          className="absolute inset-0 w-full h-full rotate-45 scale-60 opacity-85"
          style={{
            filter: `drop-shadow(0 0 ${Math.max(2, size * 0.25)}px ${glowColor})`,
          }}
        >
          <path d={ASTROID_STAR_PATH} fill={color} />
        </svg>
      )}

      {/* Radiant Diamond Core */}
      <div
        className="absolute rounded-full bg-white pointer-events-none"
        style={{
          width: `${Math.max(2, size * 0.22)}px`,
          height: `${Math.max(2, size * 0.22)}px`,
          boxShadow: `0 0 ${Math.max(4, size * 0.35)}px #ffffff`,
        }}
      />
    </div>
  );
}

const SYNCHRONIZED_HERO_STARS: SyncStar[] = [
  // Phase 0 (0.0s): Top-Left quadrant
  { id: 101, top: '7%', left: '15%', size: 22, phase: 0, isHero: true },
  // Phase 1 (1.0s): Bottom-Right quadrant
  { id: 102, top: '83%', left: '85%', size: 22, phase: 1, isHero: true },
  // Phase 2 (2.0s): Top-Right quadrant
  { id: 103, top: '11%', left: '82%', size: 22, phase: 2, isHero: true },
  // Phase 3 (3.0s): Bottom-Left quadrant
  { id: 104, top: '80%', left: '13%', size: 22, phase: 3, isHero: true },
  // Phase 4 (4.0s): Upper-Center quadrant
  { id: 105, top: '16%', left: '48%', size: 20, phase: 4, isHero: true },
  // Phase 5 (5.0s): Lower-Center quadrant
  { id: 106, top: '88%', left: '52%', size: 20, phase: 5, isHero: true },
  // Phase 6 (6.0s): Mid-West flank
  { id: 107, top: '48%', left: '6%', size: 21, phase: 6, isHero: true },
  // Phase 7 (7.0s): Mid-East flank
  { id: 108, top: '46%', left: '93%', size: 21, phase: 7, isHero: true },
];

const SYNCHRONIZED_COMPANION_STARS: SyncStar[] = [
  // Phase 0 companion (North-West interior)
  { id: 201, top: '22%', left: '26%', size: 15, phase: 0 },
  // Phase 1 companion (South-East interior)
  { id: 202, top: '72%', left: '76%', size: 15, phase: 1 },
  // Phase 2 companion (North-East interior)
  { id: 203, top: '24%', left: '72%', size: 15, phase: 2 },
  // Phase 3 companion (South-West interior)
  { id: 204, top: '68%', left: '26%', size: 15, phase: 3 },
  // Phase 4 companion (Upper North-East)
  { id: 205, top: '8%', left: '58%', size: 14, phase: 4 },
  // Phase 5 companion (Lower South-West)
  { id: 206, top: '93%', left: '42%', size: 14, phase: 5 },
  // Phase 6 companion (Mid-West interior)
  { id: 207, top: '34%', left: '18%', size: 15, phase: 6 },
  // Phase 7 companion (Mid-East interior)
  { id: 208, top: '60%', left: '84%', size: 15, phase: 7 },
];

const AMBIENT_DUST_STARS: AmbientStar[] = [
  { id: 301, top: '4%', left: '32%', size: 10, duration: 4.2, delay: 0.5, maxOpacity: 0.65 },
  { id: 302, top: '14%', left: '6%', size: 9, duration: 3.8, delay: 1.2, maxOpacity: 0.6 },
  { id: 303, top: '19%', left: '92%', size: 10, duration: 4.5, delay: 2.1, maxOpacity: 0.65 },
  { id: 304, top: '27%', left: '10%', size: 9, duration: 5.0, delay: 0.8, maxOpacity: 0.6 },
  { id: 305, top: '30%', left: '88%', size: 11, duration: 4.0, delay: 1.7, maxOpacity: 0.7 },
  { id: 306, top: '39%', left: '22%', size: 9, duration: 4.8, delay: 2.6, maxOpacity: 0.55 },
  { id: 307, top: '42%', left: '78%', size: 10, duration: 3.6, delay: 0.3, maxOpacity: 0.65 },
  { id: 308, top: '54%', left: '12%', size: 9, duration: 4.4, delay: 1.9, maxOpacity: 0.6 },
  { id: 309, top: '58%', left: '88%', size: 10, duration: 5.2, delay: 2.4, maxOpacity: 0.65 },
  { id: 310, top: '64%', left: '18%', size: 9, duration: 3.9, delay: 0.7, maxOpacity: 0.55 },
  { id: 311, top: '66%', left: '80%', size: 11, duration: 4.6, delay: 1.5, maxOpacity: 0.7 },
  { id: 312, top: '75%', left: '8%', size: 9, duration: 4.1, delay: 2.8, maxOpacity: 0.6 },
  { id: 313, top: '76%', left: '90%', size: 9, duration: 3.7, delay: 0.4, maxOpacity: 0.55 },
  { id: 314, top: '86%', left: '28%', size: 10, duration: 4.9, delay: 1.8, maxOpacity: 0.65 },
  { id: 315, top: '88%', left: '70%', size: 9, duration: 4.3, delay: 2.3, maxOpacity: 0.6 },
  { id: 316, top: '94%', left: '12%', size: 9, duration: 3.5, delay: 0.9, maxOpacity: 0.55 },
  { id: 317, top: '95%', left: '85%', size: 10, duration: 5.1, delay: 1.6, maxOpacity: 0.65 },
  { id: 318, top: '5%', left: '75%', size: 9, duration: 4.0, delay: 2.0, maxOpacity: 0.6 },
  { id: 319, top: '52%', left: '2%', size: 9, duration: 3.9, delay: 1.1, maxOpacity: 0.55 },
  { id: 320, top: '50%', left: '98%', size: 10, duration: 4.7, delay: 2.7, maxOpacity: 0.65 },
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
      {/* DESKTOP/TABLET GALAXY STARS, COSMIC AURAS & CARDS (Hidden on mobile for pure plain background) */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden hidden md:block select-none z-0"
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
          className="absolute top-4 left-10 w-20 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent -rotate-25 pointer-events-none blur-[0.3px]"
        />

        {/* 1. Ambient Background Stars (Authentic 4-Point Micro Stars) */}
        {AMBIENT_DUST_STARS.map((s) => (
          <motion.div
            key={s.id}
            style={{
              top: s.top,
              left: s.left,
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              opacity: [0.22, s.maxOpacity, 0.22],
              scale: [0.85, 1.15, 0.85],
            }}
            transition={{
              duration: s.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: s.delay,
            }}
            className="pointer-events-none select-none"
          >
            <CelestialStarSvg
              size={s.size}
              color="#ffffff"
              glowColor="rgba(255,255,255,0.7)"
            />
          </motion.div>
        ))}

        {/* 2. Synchronized Companion Stars (Harmonic 4-Point Stars) */}
        {SYNCHRONIZED_COMPANION_STARS.map((s) => (
          <motion.div
            key={s.id}
            style={{
              top: s.top,
              left: s.left,
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              opacity: [0.25, 0.25, 0.95, 0.9, 0.25, 0.25],
              scale: [0.75, 0.75, 1.45, 1.35, 0.75, 0.75],
            }}
            transition={{
              duration: SYNC_CYCLE_DURATION,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: s.phase * 1.0,
              times: [0, 0.04, 0.11, 0.16, 0.24, 1],
            }}
            className="pointer-events-none select-none"
          >
            <CelestialStarSvg
              size={s.size}
              color="#e0f2fe"
              glowColor="rgba(56,189,248,0.9)"
            />
          </motion.div>
        ))}

        {/* 3. Synchronized Hero Beacons: 8-Point Royal Celestial Stars */}
        {SYNCHRONIZED_HERO_STARS.map((s) => (
          <motion.div
            key={s.id}
            style={{
              top: s.top,
              left: s.left,
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              opacity: [0.32, 0.32, 1.0, 1.0, 0.32, 0.32],
              scale: [0.75, 0.75, 1.6, 1.5, 0.75, 0.75],
            }}
            transition={{
              duration: SYNC_CYCLE_DURATION,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: s.phase * 1.0,
              times: [0, 0.04, 0.11, 0.16, 0.24, 1],
            }}
            className="pointer-events-none select-none"
          >
            <CelestialStarSvg
              size={s.size}
              isHero={true}
              color="#ffffff"
              glowColor="rgba(56,189,248,1)"
            />
          </motion.div>
        ))}

        {/* Celestial Cards Galaxy - Desktop Floating & Flipping Cards */}
        <div className="hidden md:block">
          {DESKTOP_CARDS.map((config) => (
            <DynamicCardItem key={config.id} config={config} mouseOffset={mouseOffset} />
          ))}
        </div>
      </div>
    </>
  );
}
