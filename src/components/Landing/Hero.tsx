import { motion } from 'framer-motion';
import FloatingCards from '../common/FloatingCards';
import { useGameStore } from '../../store/gameStore';

export default function Hero() {
  const setView = useGameStore((s) => s.setView);
  return (
    <section id="home" className="relative gradient-purple-blue overflow-hidden">
      <FloatingCards />
      <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="flex justify-center mb-2"
        >
          <img
            src="/Ass Logo.png"
            alt="Ass Logo"
            className="w-40 h-40 sm:w-52 sm:h-52 object-contain drop-shadow-[0_12px_35px_rgba(56,189,248,0.45)] hover:scale-105 transition-transform"
          />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="font-display font-extrabold text-5xl sm:text-7xl text-white drop-shadow-[0_4px_24px_rgba(37,99,235,0.55)]"
        >
          ASS
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-3 font-display font-semibold text-xl sm:text-2xl text-gradient"
        >
          The Ultimate Classroom Donkey Card Game
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-2 text-white/70 text-sm sm:text-base"
        >
          Donkey Master • Get Away • Kazhutha • Katte
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mt-9 flex flex-col items-center gap-3 max-w-xs mx-auto"
        >
          <button
            onClick={() => setView('create')}
            className="btn-glow-blue w-full rounded-2xl py-4 font-display font-bold text-white text-lg tracking-wide active:scale-95 transition-transform"
          >
            Create Room
          </button>
          <button
            onClick={() => setView('join')}
            className="glass w-full rounded-2xl py-4 font-display font-bold text-white text-lg tracking-wide active:scale-95 transition-transform"
          >
            Join Room
          </button>
        </motion.div>

        <p className="mt-6 text-white/50 text-xs">
          No sign-up. No matchmaking. Just a room code and your friends.
        </p>
      </div>
    </section>
  );
}
