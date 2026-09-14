import { motion } from 'framer-motion';
import { GiDonkey } from 'react-icons/gi';
import { HiOutlineLogout } from 'react-icons/hi';
import { PlayerRow } from '../../types';
import Confetti from './Confetti';

const MEDALS = ['🥇', '🥈', '🥉'];

interface Props {
  players: PlayerRow[];
  rankings: string[];
  donkeyId: string | null;
  isHost: boolean;
  onPlayAgain: () => void;
  onExit: () => void;
}

export default function EndGameModal({ players, rankings, donkeyId, isHost, onPlayAgain, onExit }: Props) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const orderedIds = [...rankings];
  if (donkeyId && !orderedIds.includes(donkeyId)) orderedIds.push(donkeyId);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-5">
      <Confetti />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="glass relative w-full max-w-sm rounded-3xl p-5 sm:p-6 text-center max-h-[88dvh] overflow-y-auto"
      >
        <div className="flex justify-center mb-1">
          <img src="/Ass Logo.png" alt="Ass Logo" className="w-16 h-16 object-contain drop-shadow-md" />
        </div>
        <h2 className="font-display font-extrabold text-2xl text-white tracking-wide">GAME OVER</h2>

        <div className="mt-5 flex flex-col gap-2">
          {orderedIds.map((id, i) => {
            const p = byId.get(id);
            if (!p) return null;
            const place = i + 1;
            const isDonkey = id === donkeyId;
            return (
              <div
                key={id}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-left ${
                  isDonkey ? 'bg-red-500/25 border border-red-300/40' : 'bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center">{MEDALS[i] ?? `${place}.`}</span>
                  <span className="text-white text-sm font-semibold">
                    {p.name} {isDonkey ? '(ASS)' : '(Escaped)'}
                  </span>
                </div>
                {isDonkey && <GiDonkey className="text-red-300 text-lg" />}
              </div>
            );
          })}
        </div>

        {donkeyId && (
          <p className="mt-5 font-display font-extrabold text-2xl text-gradient">
            {byId.get(donkeyId)?.id ? `${byId.get(donkeyId)?.name.toUpperCase()} IS THE ASS! 🫏` : ''}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onExit}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-display font-bold text-white glass active:scale-95 transition-transform"
          >
            <HiOutlineLogout /> EXIT
          </button>
          {isHost ? (
            <button
              onClick={onPlayAgain}
              className="flex-1 rounded-2xl py-3.5 font-display font-bold text-white btn-glow-blue active:scale-95 transition-transform"
            >
              PLAY AGAIN
            </button>
          ) : (
            <div className="flex-1 rounded-2xl py-3.5 font-display font-bold text-white/50 text-sm flex items-center justify-center">
              Waiting for host...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
