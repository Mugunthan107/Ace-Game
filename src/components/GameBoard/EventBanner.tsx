import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameEvent } from '../../types';

export default function EventBanner({ event, at }: { event: GameEvent | null; at: number }) {
  const [visible, setVisible] = useState(false);
  const lastShownHitAtRef = useRef<number | null>(null);

  useEffect(() => {
    // Only trigger popup for HIT events when a player gets hit
    if (!event || event.type !== 'hit') {
      return;
    }

    // Ensure the hit popup only fires ONCE per hit event
    if (lastShownHitAtRef.current === at) {
      return;
    }
    lastShownHitAtRef.current = at;

    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, [event, at]);

  // If not a hit event or not visible, do not render any popup
  if (!event || event.type !== 'hit') return null;

  return (
    <div className="absolute top-11 sm:top-14 left-1/2 -translate-x-1/2 z-40 flex justify-center pointer-events-none select-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: -14 }}
            animate={{ opacity: 1, scale: [0.7, 1.15, 1], y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 border border-rose-300/60 text-white font-black text-xs sm:text-sm tracking-wide shadow-[0_0_30px_rgba(225,29,72,0.7)]"
          >
            <span className="text-base sm:text-lg animate-bounce">💥</span>
            <span>
              HIT! {event.collectorName ? `${event.collectorName} takes all ${event.cardCount ?? ''} cards!` : ''}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
