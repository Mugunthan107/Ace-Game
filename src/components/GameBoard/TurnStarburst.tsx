import { memo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  sizeClass?: string;
  className?: string;
}

// 40 deterministic radiant rays replicating the authentic firework burst from user's image
// Varied in length (long needle spikes, medium electric rays, short dense core sparks)
const RAYS = [
  // Primary long needle spikes (reaching outward with sharp tapered tips)
  { deg: 0, rin: 18, rout: 92, w: 2.4, grad: 'white-rose' },
  { deg: 10, rin: 22, rout: 68, w: 1.5, grad: 'magenta' },
  { deg: 18, rin: 19, rout: 86, w: 2.2, grad: 'white-rose' },
  { deg: 27, rin: 23, rout: 58, w: 1.2, grad: 'violet' },
  { deg: 36, rin: 19, rout: 94, w: 2.4, grad: 'white-rose' },
  { deg: 45, rin: 22, rout: 72, w: 1.6, grad: 'magenta' },
  { deg: 54, rin: 20, rout: 82, w: 2.0, grad: 'white-rose' },
  { deg: 63, rin: 23, rout: 55, w: 1.2, grad: 'violet' },
  { deg: 72, rin: 19, rout: 90, w: 2.3, grad: 'white-rose' },
  { deg: 81, rin: 22, rout: 65, w: 1.5, grad: 'magenta' },
  { deg: 90, rin: 18, rout: 93, w: 2.4, grad: 'white-rose' },
  { deg: 99, rin: 23, rout: 60, w: 1.3, grad: 'violet' },
  { deg: 108, rin: 19, rout: 88, w: 2.2, grad: 'white-rose' },
  { deg: 117, rin: 22, rout: 70, w: 1.6, grad: 'magenta' },
  { deg: 126, rin: 18, rout: 95, w: 2.4, grad: 'white-rose' },
  { deg: 135, rin: 23, rout: 56, w: 1.2, grad: 'violet' },
  { deg: 144, rin: 20, rout: 84, w: 2.1, grad: 'white-rose' },
  { deg: 153, rin: 22, rout: 68, w: 1.5, grad: 'magenta' },
  { deg: 162, rin: 19, rout: 91, w: 2.3, grad: 'white-rose' },
  { deg: 171, rin: 23, rout: 59, w: 1.3, grad: 'violet' },
  { deg: 180, rin: 18, rout: 94, w: 2.4, grad: 'white-rose' },
  { deg: 189, rin: 22, rout: 67, w: 1.5, grad: 'magenta' },
  { deg: 198, rin: 19, rout: 87, w: 2.2, grad: 'white-rose' },
  { deg: 207, rin: 23, rout: 57, w: 1.2, grad: 'violet' },
  { deg: 216, rin: 18, rout: 92, w: 2.4, grad: 'white-rose' },
  { deg: 225, rin: 22, rout: 71, w: 1.6, grad: 'magenta' },
  { deg: 234, rin: 20, rout: 85, w: 2.1, grad: 'white-rose' },
  { deg: 243, rin: 23, rout: 58, w: 1.2, grad: 'violet' },
  { deg: 252, rin: 19, rout: 89, w: 2.3, grad: 'white-rose' },
  { deg: 261, rin: 22, rout: 66, w: 1.5, grad: 'magenta' },
  { deg: 270, rin: 18, rout: 93, w: 2.4, grad: 'white-rose' },
  { deg: 279, rin: 23, rout: 61, w: 1.3, grad: 'violet' },
  { deg: 288, rin: 19, rout: 88, w: 2.2, grad: 'white-rose' },
  { deg: 297, rin: 22, rout: 69, w: 1.6, grad: 'magenta' },
  { deg: 306, rin: 18, rout: 95, w: 2.4, grad: 'white-rose' },
  { deg: 315, rin: 23, rout: 55, w: 1.2, grad: 'violet' },
  { deg: 324, rin: 20, rout: 83, w: 2.0, grad: 'white-rose' },
  { deg: 333, rin: 22, rout: 67, w: 1.5, grad: 'magenta' },
  { deg: 342, rin: 19, rout: 91, w: 2.3, grad: 'white-rose' },
  { deg: 351, rin: 23, rout: 58, w: 1.3, grad: 'violet' },
];

// Sparkle stars (glints) matching the bright 4-point stars in the user's reference image
const SPARKLES = [
  { x: 154, y: 64, size: 10, delay: 0 },
  { x: 168, y: 118, size: 13, delay: 0.7 },
  { x: 44, y: 62, size: 8, delay: 1.2 },
  { x: 138, y: 156, size: 9, delay: 0.4 },
];

function TurnStarburst({ sizeClass = 'w-28 h-28 sm:w-36 sm:h-36', className = '' }: Props) {
  return (
    <div
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none -z-10 ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      {/* Radiant breathing & subtle shimmer motion */}
      <motion.div
        animate={{
          scale: [0.93, 1.05, 0.93],
          opacity: [0.92, 1, 0.92],
          rotate: [0, 4, -4, 0],
        }}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-full h-full relative flex items-center justify-center"
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full overflow-visible drop-shadow-[0_0_16px_rgba(244,63,94,0.7)]"
        >
          <defs>
            {/* White-Hot Core to Vivid Rose Spike */}
            <linearGradient id="starburst-grad-white-rose" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="28%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#ff2ebb" stopOpacity="0.88" />
              <stop offset="80%" stopColor="#f43f5e" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
            </linearGradient>

            {/* Neon Magenta/Fuchsia Spike */}
            <linearGradient id="starburst-grad-magenta" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#ff1493" stopOpacity="0.85" />
              <stop offset="65%" stopColor="#d946ef" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>

            {/* Radiant Violet Accent Spike */}
            <linearGradient id="starburst-grad-violet" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbcfe8" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#e879f9" stopOpacity="0.6" />
              <stop offset="85%" stopColor="#c084fc" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>

            {/* Atmospheric Diffuse Pink/Violet Aura */}
            <radialGradient id="starburst-soft-aura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff2ebb" stopOpacity="0.45" />
              <stop offset="35%" stopColor="#ec4899" stopOpacity="0.3" />
              <stop offset="65%" stopColor="#a855f7" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
            </radialGradient>

            {/* Brilliant Intense Nuclear Core Behind Avatar */}
            <radialGradient id="starburst-core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="25%" stopColor="#ff2ebb" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="85%" stopColor="#d946ef" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Soft atmospheric glowing cloud */}
          <circle cx="100" cy="100" r="94" fill="url(#starburst-soft-aura)" />

          {/* 2. Intense center flare behind avatar rim */}
          <circle cx="100" cy="100" r="38" fill="url(#starburst-core-glow)" />

          {/* 3. Radiant 360-degree firework spikes (needle-tapered polygons) */}
          <g>
            {RAYS.map((r, i) => {
              const gradId =
                r.grad === 'white-rose'
                  ? 'url(#starburst-grad-white-rose)'
                  : r.grad === 'magenta'
                  ? 'url(#starburst-grad-magenta)'
                  : 'url(#starburst-grad-violet)';

              // Tapered needle path from base radius (rin) to sharp needle tip (rout)
              const halfW = r.w / 2;
              const pathD = `M ${100 + r.rin} ${100 - halfW} L ${100 + r.rout} 100 L ${100 + r.rin} ${
                100 + halfW
              } Z`;

              return (
                <path
                  key={`burst-ray-${i}`}
                  d={pathD}
                  fill={gradId}
                  transform={`rotate(${r.deg} 100 100)`}
                />
              );
            })}
          </g>

          {/* 4. Fine core filament needles for dense exploding texture */}
          <g>
            {RAYS.filter((_, idx) => idx % 2 === 0).map((r, i) => (
              <line
                key={`filament-${i}`}
                x1={100 + r.rin}
                y1="100"
                x2={100 + r.rout * 0.9}
                y2="100"
                stroke="#ffffff"
                strokeWidth="0.8"
                strokeOpacity="0.75"
                strokeLinecap="round"
                transform={`rotate(${r.deg + 4} 100 100)`}
              />
            ))}
          </g>

          {/* 5. Glistening 4-point sparkle stars with bright cores (matching image 2) */}
          {SPARKLES.map((sp, i) => {
            const rad = sp.size / 2;
            const starPath = `M 0 ${-rad} Q 0 0 ${rad} 0 Q 0 0 0 ${rad} Q 0 0 ${-rad} 0 Q 0 0 0 ${-rad} Z`;

            return (
              <g key={`sparkle-${i}`} transform={`translate(${sp.x}, ${sp.y})`}>
                {/* Glow ring */}
                <circle cx="0" cy="0" r={rad * 1.3} fill="#ff2ebb" opacity="0.4" />
                {/* 4-point astroid star */}
                <path d={starPath} fill="#ffffff" />
                {/* Core bright dot */}
                <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
              </g>
            );
          })}
        </svg>
      </motion.div>
    </div>
  );
}

export default memo(TurnStarburst);
