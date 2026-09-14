import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export default function ToastHost() {
  const toast = useGameStore((s) => s.toast);
  const error = useGameStore((s) => s.error);
  const setToast = useGameStore((s) => s.setToast);
  const setError = useGameStore((s) => s.setError);
  const message = error ?? toast;
  const isError = Boolean(error);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      if (error) setError(null);
      if (toast) setToast(null);
    }, 3200);
    return () => clearTimeout(t);
  }, [message, error, toast, setError, setToast]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-sm pointer-events-none">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className={`glass rounded-2xl px-4 py-3 text-center text-sm font-semibold text-white shadow-xl ${
              isError ? 'bg-red-500/30 border-red-300/40' : 'bg-black/30'
            }`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
