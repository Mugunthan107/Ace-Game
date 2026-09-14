import { motion } from 'framer-motion';
import FloatingCards from '../common/FloatingCards';
import { useGameStore } from '../../store/gameStore';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function Landing() {
  const setView = useGameStore((s) => s.setView);


  return (
    <main className="relative min-h-[100dvh] w-full gradient-purple-blue overflow-hidden flex flex-col items-center justify-center select-none px-6 safe-top safe-bottom">
      <FloatingCards />

      <div className="relative z-10 max-w-sm w-full mx-auto text-center flex flex-col items-center">
        {/* Ass Logo with Ambient Aurora & Seamless Feathered Edge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 220, damping: 20 }}
          className="relative flex justify-center mb-2"
        >
          {/* Subtle cosmic aura radiating behind the logo */}
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-600/10 blur-2xl rounded-full -z-10 pointer-events-none" />

          <img
            src="/Ass Logo.png"
            alt="Ass Logo"
            className="w-48 sm:w-56 h-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)] hover:scale-105 transition-transform"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.26 }}
          className="mt-8 flex flex-col gap-3.5 w-full max-w-xs"
        >
          <button
            onClick={() => setView('create')}
            className="btn-glow-blue w-full rounded-2xl py-4 font-display font-bold text-white text-base sm:text-lg tracking-wider active:scale-95 transition-all hover:brightness-105"
          >
            CREATE ROOM
          </button>
          <button
            onClick={() => setView('join')}
            className="glass w-full rounded-2xl py-4 font-display font-bold text-white text-base sm:text-lg tracking-wider active:scale-95 transition-all hover:bg-white/10 hover:border-white/30"
          >
            JOIN ROOM
          </button>

          {!isSupabaseConfigured && (
            <div className="mt-2 text-xs bg-amber-500/20 border border-amber-500/40 text-amber-200 rounded-xl p-3 backdrop-blur-md text-left">
              <p className="font-bold text-amber-300 mb-1">⚠️ Supabase Not Connected</p>
              <p>Add <code className="bg-black/40 px-1 py-0.5 rounded text-white">VITE_SUPABASE_URL</code> and <code className="bg-black/40 px-1 py-0.5 rounded text-white">VITE_SUPABASE_PUBLISHABLE_KEY</code> in your Vercel Project Settings &gt; Environment Variables.</p>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}

