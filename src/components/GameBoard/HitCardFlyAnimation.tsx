import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrickCard } from '../../types';
import PlayingCard from './PlayingCard';

interface Props {
  cards: TrickCard[];
  targetPos: { left: string; top: string };
  collectorName: string;
  isMe: boolean;
}

/**
 * Synthesizes a soft physical card-dealing swoosh sound using Web Audio API.
 */
function playCardSwooshSound(pitchMultiplier = 1.0) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = 420 * pitchMultiplier;
    const endFreq = 160 * pitchMultiplier;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.14);

    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // AudioContext blocked by policy — silently continue
  }
}

export default function HitCardFlyAnimation({
  cards,
  targetPos,
  collectorName,
  isMe,
}: Props) {
  const [landedCount, setLandedCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Schedule audio cues and landing shockwaves for each card sequentially
    cards.forEach((_, i) => {
      // Launch time for card i
      const launchDelay = (0.75 + i * 0.24) * 1000;
      const tLaunch = setTimeout(() => {
        playCardSwooshSound(1.0 + i * 0.06);
      }, launchDelay);
      timers.push(tLaunch);

      // Landing time for card i (launch + flight duration ~380ms)
      const landDelay = launchDelay + 360;
      const tLand = setTimeout(() => {
        setLandedCount((prev) => prev + 1);
      }, landDelay);
      timers.push(tLand);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [cards]);

  if (!cards || cards.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
      {/* Target Player Landing Absorption Halo & Counter */}
      <div
        style={{ left: targetPos.left, top: targetPos.top }}
        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-40"
      >
        <AnimatePresence>
          {landedCount > 0 && (
            <motion.div
              key={`counter-${landedCount}`}
              initial={{ scale: 0.6, opacity: 0, y: 10 }}
              animate={{ scale: [1, 1.25, 1], opacity: 1, y: -24 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] sm:text-[11px] shadow-[0_0_16px_rgba(244,63,94,0.9)] border border-white/60 tracking-wider whitespace-nowrap uppercase flex items-center gap-1"
            >
              <span>📥 +{landedCount}</span>
              <span className="text-[7px] sm:text-[9px] opacity-90">
                ({landedCount}/{cards.length})
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring expanding on each card impact */}
        <AnimatePresence>
          {landedCount > 0 && (
            <motion.span
              key={`ring-${landedCount}`}
              initial={{ scale: 0.8, opacity: 0.9 }}
              animate={{ scale: 2.3, opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="absolute w-12 h-12 rounded-full border-2 border-rose-400 bg-rose-500/20"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Sequential Line-by-Line Flying Cards */}
      {cards.map((tc, i) => {
        const launchDelay = 0.75 + i * 0.24;
        const flightDuration = 0.42;

        return (
          <motion.div
            key={`flying-${tc.playerId}-${tc.card.id}`}
            initial={{
              left: '50%',
              top: '46%',
              x: '-50%',
              y: '-50%',
              scale: 0.95,
              opacity: 0,
              rotate: 0,
            }}
            animate={{
              left: ['50%', '50%', targetPos.left],
              top: ['46%', '46%', targetPos.top],
              x: '-50%',
              y: '-50%',
              scale: [0.95, 1.15, 0.4],
              opacity: [0, 1, 0],
              rotate: [0, i % 2 === 0 ? -18 : 18, (i % 2 === 0 ? 30 : -30)],
            }}
            transition={{
              duration: flightDuration,
              delay: launchDelay,
              times: [0, 0.2, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute z-35 flex flex-col items-center"
          >
            {/* Elevated glowing card during flight */}
            <div className="relative shadow-[0_0_24px_rgba(244,63,94,0.9)] rounded-lg filter drop-shadow-xl">
              <PlayingCard card={tc.card} size="sm" className="ring-2 ring-rose-400" />
            </div>

            {/* Micro badge identifying card owner */}
            <span className="mt-0.5 text-[7px] font-extrabold bg-slate-950/90 text-rose-300 border border-rose-500/50 px-1 py-0.2 rounded-full shadow">
              {tc.playerName}
            </span>
          </motion.div>
        );
      })}

      {/* Floating Status Pill across center */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="absolute top-[28%] sm:top-[30%] left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-slate-950/90 border border-rose-500/70 shadow-[0_0_25px_rgba(225,29,72,0.6)] backdrop-blur-md flex items-center gap-1.5 text-white text-[10px] sm:text-xs font-black tracking-wide uppercase select-none"
      >
        <span className="animate-spin text-xs">🌀</span>
        <span className="text-rose-300 font-extrabold">
          {isMe ? 'You take all cards!' : `${collectorName} takes all cards!`}
        </span>
        <span className="text-white/60">•</span>
        <span className="text-amber-300 font-bold">{cards.length} cards</span>
      </motion.div>
    </div>
  );
}
