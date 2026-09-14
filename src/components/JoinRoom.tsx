import { useState } from 'react';
import { HiArrowLeft } from 'react-icons/hi2';
import { useGameStore } from '../store/gameStore';
import FloatingCards from './common/FloatingCards';

export default function JoinRoom() {
  const setView = useGameStore((s) => s.setView);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const loading = useGameStore((s) => s.loading);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const canSubmit = name.trim().length >= 2 && code.trim().length === 4 && !loading;

  return (
    <div className="gradient-purple-blue min-h-[100dvh] relative flex flex-col justify-between safe-top safe-bottom overflow-y-auto">
      <FloatingCards />
      <div className="relative px-5 pt-4">
        <button
          onClick={() => setView('landing')}
          className="text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-medium active:scale-95 transition-transform"
        >
          <HiArrowLeft /> Back
        </button>
      </div>
      <div className="relative flex-1 flex items-center justify-center px-4 py-4 sm:py-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) joinRoom(name, code);
          }}
          className="glass w-full max-w-sm rounded-3xl p-5 sm:p-6 relative border border-cyan-500/20"
        >
          <div className="flex justify-center mb-1">
            <img
              src="/Ass Logo.png"
              alt="Ass Logo"
              className="w-16 sm:w-20 h-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
            />
          </div>
          <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white text-center tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            JOIN ROOM
          </h1>

          <label className="block mt-6 text-cyan-100/90 text-sm font-medium">Your Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder="e.g. Sarah"
            className="mt-2 w-full rounded-xl px-4 py-3 bg-slate-900/70 border border-cyan-500/30 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
          />

          <label className="block mt-5 text-cyan-100/90 text-sm font-medium">Room Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="4821"
            className="mt-2 w-full rounded-xl px-4 py-3 bg-slate-900/70 border border-cyan-500/30 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-400 tracking-[0.5em] text-center font-display font-bold text-xl transition-all"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-glow-blue disabled:opacity-50 disabled:cursor-not-allowed w-full mt-7 rounded-2xl py-3.5 font-display font-bold text-white text-base tracking-wider active:scale-95 transition-all shadow-[0_0_25px_rgba(0,210,255,0.35)]"
          >
            {loading ? 'Joining...' : 'JOIN ROOM'}
          </button>
        </form>
      </div>
    </div>
  );
}
