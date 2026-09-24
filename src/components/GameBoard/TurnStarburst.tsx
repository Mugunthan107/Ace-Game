import { memo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  sizeClass?: string;
  className?: string;
}

// 40 deterministic radiant rays replicating the authentic firework burst
// 100% Pure Luxurious Royal Gold palette - no rose or pink
const RAYS = [
  // Primary long needle spikes (reaching outward with sharp tapered tips)
  { deg: 0, rin: 18, rout: 92, w: 2.4, grad: 'gold-primary' },
  { deg: 10, rin: 22, rout: 68, w: 1.5, grad: 'gold-amber' },
  { deg: 18, rin: 19, rout: 86, w: 2.2, grad: 'gold-primary' },
  { deg: 27, rin: 23, rout: 58, w: 1.2, grad: 'gold-champagne' },
  { deg: 36, rin: 19, rout: 94, w: 2.4, grad: 'gold-primary' },
  { deg: 45, rin: 22, rout: 72, w: 1.6, grad: 'gold-amber' },
  { deg: 54, rin: 20, rout: 82, w: 2.0, grad: 'gold-primary' },
  { deg: 63, rin: 23, rout: 55, w: 1.2, grad: 'gold-champagne' },
  { deg: 72, rin: 19, rout: 90, w: 2.3, grad: 'gold-primary' },
  { deg: 81, rin: 22, rout: 65, w: 1.5, grad: 'gold-amber' },
  { deg: 90, rin: 18, rout: 93, w: 2.4, grad: 'gold-primary' },
  { deg: 99, rin: 23, rout: 60, w: 1.3, grad: 'gold-champagne' },
  { deg: 108, rin: 19, rout: 88, w: 2.2, grad: 'gold-primary' },
  { deg: 117, rin: 22, rout: 70, w: 1.6, grad: 'gold-amber' },
  { deg: 126, rin: 18, rout: 95, w: 2.4, grad: 'gold-primary' },
  { deg: 135, rin: 23, rout: 56, w: 1.2, grad: 'gold-champagne' },
  { deg: 144, rin: 20, rout: 84, w: 2.1, grad: 'gold-primary' },
  { deg: 153, rin: 22, rout: 68, w: 1.5, grad: 'gold-amber' },
  { deg: 162, rin: 19, rout: 91, w: 2.3, grad: 'gold-primary' },
  { deg: 171, rin: 23, rout: 59, w: 1.3, grad: 'gold-champagne' },
  { deg: 180, rin: 18, rout: 94, w: 2.4, grad: 'gold-primary' },
  { deg: 189, rin: 22, rout: 67, w: 1.5, grad: 'gold-amber' },
  { deg: 198, rin: 19, rout: 87, w: 2.2, grad: 'gold-primary' },
  { deg: 207, rin: 23, rout: 57, w: 1.2, grad: 'gold-champagne' },
  { deg: 216, rin: 18, rout: 92, w: 2.4, grad: 'gold-primary' },
  { deg: 225, rin: 22, rout: 71, w: 1.6, grad: 'gold-amber' },
  { deg: 234, rin: 20, rout: 85, w: 2.1, grad: 'gold-primary' },
  { deg: 243, rin: 23, rout: 58, w: 1.2, grad: 'gold-champagne' },
  { deg: 252, rin: 19, rout: 89, w: 2.3, grad: 'gold-primary' },
  { deg: 261, rin: 22, rout: 66, w: 1.5, grad: 'gold-amber' },
  { deg: 270, rin: 18, rout: 93, w: 2.4, grad: 'gold-primary' },
  { deg: 279, rin: 23, rout: 61, w: 1.3, grad: 'gold-champagne' },
  { deg: 288, rin: 19, rout: 88, w: 2.2, grad: 'gold-primary' },
  { deg: 297, rin: 22, rout: 69, w: 1.6, grad: 'gold-amber' },
  { deg: 306, rin: 18, rout: 95, w: 2.4, grad: 'gold-primary' },
  { deg: 315, rin: 23, rout: 55, w: 1.2, grad: 'gold-champagne' },
  { deg: 324, rin: 20, rout: 83, w: 2.0, grad: 'gold-primary' },
  { deg: 333, rin: 22, rout: 67, w: 1.5, grad: 'gold-amber' },
  { deg: 342, rin: 19, rout: 91, w: 2.3, grad: 'gold-primary' },
  { deg: 351, rin: 23, rout: 58, w: 1.3, grad: 'gold-champagne' },
];

// 6 deterministic sparkle stars (glints) framing the avatar symmetrically
// 3 on the left flank, 3 on the right flank, all fully visible outside badges and name pill
// Mathematically synchronized to the 1.3s medium-fast zoom cycle with professional, balanced scaling
const SPARKLES = [
  // Pair 1: Upper stars (Top-Left & Top-Right) - sparkle as burst expands
  {
    id: 'sp-tl',
    x: 44,
    y: 62,
    size: 10,
    scale: [0.4, 1.15, 0.5, 0.4],
    opacity: [0.35, 1, 0.45, 0.35],
    rot: [0, 45, 0, 0],
    times: [0, 0.28, 0.55, 1],
  },
  {
    id: 'sp-tr',
    x: 156,
    y: 62,
    size: 10,
    scale: [0.4, 1.15, 0.5, 0.4],
    opacity: [0.35, 1, 0.45, 0.35],
    rot: [0, -45, 0, 0],
    times: [0, 0.28, 0.55, 1],
  },

  // Pair 2: Middle stars (Mid-Left & Mid-Right) - peak flare right at maximum zoom-out burst
  {
    id: 'sp-ml',
    x: 30,
    y: 102,
    size: 11,
    scale: [0.45, 0.45, 1.2, 0.45],
    opacity: [0.35, 0.4, 1, 0.35],
    rot: [0, 0, 45, 0],
    times: [0, 0.25, 0.55, 1],
  },
  {
    id: 'sp-mr',
    x: 170,
    y: 102,
    size: 11,
    scale: [0.45, 0.45, 1.2, 0.45],
    opacity: [0.35, 0.4, 1, 0.35],
    rot: [0, 0, -45, 0],
    times: [0, 0.25, 0.55, 1],
  },

  // Pair 3: Lower stars (Lower-Left & Lower-Right / Final Star) - clean, professional glint smoothly returning to base
  {
    id: 'sp-bl',
    x: 46,
    y: 140,
    size: 8.5,
    scale: [0.45, 0.45, 0.95, 0.45],
    opacity: [0.35, 0.35, 0.9, 0.35],
    rot: [0, 0, 30, 0],
    times: [0, 0.55, 0.8, 1],
  },
  {
    id: 'sp-br',
    x: 154,
    y: 140,
    size: 8.5,
    scale: [0.45, 0.45, 0.95, 0.45],
    opacity: [0.35, 0.35, 0.9, 0.35],
    rot: [0, 0, -30, 0],
    times: [0, 0.55, 0.8, 1],
  },
];

function TurnStarburst({ sizeClass = 'w-28 h-28 sm:w-36 sm:h-36', className = '' }: Props) {
  return (
    <div
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none -z-10 ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      {/* 1. Entrance pop: Zooms out from small to full size medium fast upon appearing */}
      <motion.div
        initial={{ scale: 0.25, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full relative flex items-center justify-center"
      >
        {/* 2. Continuous medium-fast zoom out and zoom in pulse (1.3s cycle) with ray shimmer */}
        <motion.div
          animate={{
            scale: [0.88, 1.18, 0.88],
            opacity: [0.88, 1, 0.88],
            rotate: [-3, 3, -3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-full h-full relative flex items-center justify-center"
        >
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full overflow-visible drop-shadow-[0_0_20px_rgba(245,158,11,0.85)]"
          >
            <defs>
              {/* Primary 24K Brilliant Gold Needle Spike */}
              <linearGradient id="starburst-grad-gold-primary" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="22%" stopColor="#fffbeb" stopOpacity="0.98" />
                <stop offset="48%" stopColor="#fde047" stopOpacity="0.95" />
                <stop offset="72%" stopColor="#f59e0b" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
              </linearGradient>

              {/* Secondary Warm Imperial Amber Gold Spike */}
              <linearGradient id="starburst-grad-gold-amber" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="25%" stopColor="#fef08a" stopOpacity="0.92" />
                <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="85%" stopColor="#d97706" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
              </linearGradient>

              {/* Tertiary Luminous Champagne Gold Accent Spike */}
              <linearGradient id="starburst-grad-gold-champagne" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="30%" stopColor="#fef9c3" stopOpacity="0.95" />
                <stop offset="60%" stopColor="#fde047" stopOpacity="0.7" />
                <stop offset="85%" stopColor="#eab308" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
              </linearGradient>

              {/* Atmospheric Diffuse Pure Gold Halo Aura */}
              <radialGradient id="starburst-soft-aura" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
                <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="68%" stopColor="#d97706" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
              </radialGradient>

              {/* Nuclear White-Hot Supernova Gold Core */}
              <radialGradient id="starburst-core-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="25%" stopColor="#fef08a" stopOpacity="0.95" />
                <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.75" />
                <stop offset="82%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 1. Soft atmospheric glowing cloud (Pure Gold) */}
            <circle cx="100" cy="100" r="94" fill="url(#starburst-soft-aura)" />

            {/* 2. Intense center flare behind avatar rim (White-Hot Gold) */}
            <circle cx="100" cy="100" r="38" fill="url(#starburst-core-glow)" />

            {/* 3. Radiant 360-degree firework spikes (needle-tapered polygons in Pure Gold) */}
            <g>
              {RAYS.map((r, i) => {
                const gradId =
                  r.grad === 'gold-primary'
                    ? 'url(#starburst-grad-gold-primary)'
                    : r.grad === 'gold-amber'
                    ? 'url(#starburst-grad-gold-amber)'
                    : 'url(#starburst-grad-gold-champagne)';

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

            {/* 4. Fine core filament needles for dense gold exploding texture */}
            <g>
              {RAYS.filter((_, idx) => idx % 2 === 0).map((r, i) => (
                <line
                  key={`filament-${i}`}
                  x1={100 + r.rin}
                  y1="100"
                  x2={100 + r.rout * 0.9}
                  y2="100"
                  stroke="#fef08a"
                  strokeWidth="0.8"
                  strokeOpacity="0.85"
                  strokeLinecap="round"
                  transform={`rotate(${r.deg + 4} 100 100)`}
                />
              ))}
            </g>

            {/* 5. Exactly 6 synchronized twinkling 4-point sparkle stars with gold glint flares */}
            {SPARKLES.map((sp) => {
              const rad = sp.size / 2;
              const starPath = `M 0 ${-rad} Q 0 0 ${rad} 0 Q 0 0 0 ${rad} Q 0 0 ${-rad} 0 Q 0 0 0 ${-rad} Z`;

              return (
                <g key={sp.id} transform={`translate(${sp.x}, ${sp.y})`}>
                  <motion.g
                    animate={{
                      scale: sp.scale,
                      opacity: sp.opacity,
                      rotate: sp.rot,
                    }}
                    transition={{
                      duration: 1.3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      times: sp.times,
                    }}
                    style={{ transformOrigin: '0px 0px' }}
                  >
                    {/* Pure Gold atmospheric soft halo */}
                    <circle cx="0" cy="0" r={rad * 1.4} fill="#fbbf24" opacity="0.4" />

                    {/* Rich Amber Gold glow accent */}
                    <circle cx="0" cy="0" r={rad * 0.9} fill="#f59e0b" opacity="0.65" />

                    {/* Brilliant 4-point astroid star diamond */}
                    <path d={starPath} fill="#ffffff" />

                    {/* Sharp cross-glint needle flare rays */}
                    <line
                      x1={-rad * 1.4}
                      y1="0"
                      x2={rad * 1.4}
                      y2="0"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                      strokeLinecap="round"
                      strokeOpacity="0.85"
                    />
                    <line
                      x1="0"
                      y1={-rad * 1.4}
                      x2="0"
                      y2={rad * 1.4}
                      stroke="#ffffff"
                      strokeWidth="0.8"
                      strokeLinecap="round"
                      strokeOpacity="0.85"
                    />

                    {/* White-hot center pin dot */}
                    <circle cx="0" cy="0" r={rad * 0.28} fill="#ffffff" />
                  </motion.g>
                </g>
              );
            })}
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default memo(TurnStarburst);
