import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineClipboard,
  HiOutlineCheck,
  HiOutlineShare,
  HiOutlineLogout,
} from 'react-icons/hi';
import {
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlineMinus,
  HiOutlineXMark,
  HiPlay,
} from 'react-icons/hi2';
import { GiCrown, GiRobotAntennas } from 'react-icons/gi';
import { useGameStore } from '../store/gameStore';
import { PlayerRow } from '../types';
import FloatingCards from './common/FloatingCards';

interface SeatItemProps {
  p: PlayerRow;
  isHost: boolean;
  myId: string | null;
  onRemove: (id: string) => void;
}

const ProfessionalSeatItem = memo(function ProfessionalSeatItem({
  p,
  isHost,
  myId,
  onRemove,
}: SeatItemProps) {
  const isMe = p.id === myId;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex flex-col items-center w-[72px] sm:w-[80px] relative group"
    >
      {/* Remove button for host */}
      {isHost && !isMe && (
        <button
          onClick={() => onRemove(p.id)}
          className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] shadow transition-transform active:scale-90"
          title={`Remove ${p.name}`}
        >
          <HiOutlineXMark />
        </button>
      )}

      {/* Avatar Container */}
      <div className="relative">
        {/* Crown for Host */}
        {p.is_host && (
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-amber-300 text-base drop-shadow-[0_2px_6px_rgba(245,158,11,0.6)] z-10">
            <GiCrown />
          </span>
        )}

        <div
          className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center font-display font-extrabold text-white text-base shadow-lg transition-transform border-2 ${
            isMe
              ? 'border-cyan-400 ring-2 ring-cyan-400/40'
              : 'border-white/20'
          }`}
          style={{
            background: `linear-gradient(135deg, ${p.avatar_color} 0%, #0f172a 120%)`,
          }}
        >
          {p.name.slice(0, 1).toUpperCase()}
        </div>

        {/* Small Host / Bot Tag */}
        {p.is_host ? (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] uppercase tracking-wider shadow">
            HOST
          </span>
        ) : p.is_bot ? (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-indigo-600 text-white font-bold text-[8px] uppercase tracking-wider flex items-center gap-0.5 shadow">
            <GiRobotAntennas className="text-[8px]" /> BOT
          </span>
        ) : null}
      </div>

      {/* Player Name */}
      <p className="text-white text-xs font-semibold truncate max-w-full text-center mt-1.5 leading-tight">
        {p.name}
      </p>

      {/* Status Dot */}
      <span className="text-[10px] text-emerald-400 font-medium leading-none mt-0.5 flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-emerald-400" />
        {isMe ? 'You' : 'Ready'}
      </span>
    </motion.div>
  );
});

export default function WaitingRoom() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore((s) => s.players);
  const myId = useGameStore((s) => s.myId);
  const startGame = useGameStore((s) => s.startGame);
  const updateMaxPlayers = useGameStore((s) => s.updateMaxPlayers);
  const cancelRoom = useGameStore((s) => s.cancelRoom);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const setToast = useGameStore((s) => s.setToast);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const me = players.find((p) => p.id === myId);

  if (!room) return null;
  const isHost = me?.is_host ?? false;
  const minAllowedPlayers = Math.max(2, players.length);
  const botsNeeded = Math.max(0, room.max_players - players.length);
  const canStart = isHost ? players.length >= 1 && room.max_players >= 2 : players.length >= 2;
  const full = players.length >= room.max_players;

  const handleStartGame = async () => {
    if (!canStart || isStarting) return;
    setIsStarting(true);
    try {
      await startGame();
    } catch (err: any) {
      setToast(err?.message || 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setToast('Room code copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast('Could not copy');
    }
  };

  const share = async () => {
    const text = `Join my Ace card game room! Room Code: ${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ace Game', text });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      setToast('Invite copied to clipboard');
    }
  };

  const emptySlotsCount = Math.max(0, room.max_players - players.length);

  return (
    <div className="gradient-purple-blue min-h-[100dvh] relative flex flex-col items-center justify-center p-4 safe-top safe-bottom overflow-y-auto">
      <FloatingCards />

      <main className="relative z-10 w-full max-w-md flex flex-col items-center my-auto">
        {/* Compact Logo & Title */}
        <div className="flex flex-col items-center mb-3">
          <img
            src="/Ass Logo.png"
            alt="Ace Logo"
            className="w-12 h-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          />
          <h1 className="font-display font-extrabold text-sm sm:text-base text-white tracking-widest uppercase mt-1">
            GAME LOBBY
          </h1>
        </div>

        {/* Professional Lobby Card */}
        <div className="w-full rounded-2xl p-4 sm:p-5 bg-[#090d1f]/90 backdrop-blur-xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
          
          {/* Room Code Header Row */}
          <div className="w-full rounded-xl p-3 bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider block">
                Room Code
              </span>
              <span className="font-mono font-black text-2xl text-white tracking-widest">
                {room.code}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={copyCode}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-semibold transition-all border border-white/10"
              >
                {copied ? (
                  <>
                    <HiOutlineCheck className="text-emerald-400 text-xs" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <HiOutlineClipboard className="text-cyan-300 text-xs" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={share}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 text-cyan-200 text-xs font-semibold transition-all border border-cyan-500/30"
              >
                <HiOutlineShare className="text-xs" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Table Seats Arena */}
          <div className="w-full mt-3 rounded-xl p-3.5 bg-black/20 border border-white/5">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-1.5">
                <HiOutlineUserGroup className="text-white/60 text-sm" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Players
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 text-cyan-300 border border-white/10">
                {players.length}/{room.max_players}
              </span>
            </div>

            {/* Compact Seats Roster */}
            <div className="flex flex-wrap items-center justify-center gap-3 py-1">
              {players.map((p) => (
                <ProfessionalSeatItem
                  key={p.id}
                  p={p}
                  isHost={isHost}
                  myId={myId}
                  onRemove={removePlayer}
                />
              ))}

              {/* Minimalist Empty Seats */}
              {Array.from({ length: emptySlotsCount }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex flex-col items-center w-[72px] sm:w-[80px]"
                >
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full border border-dashed border-white/20 bg-white/[0.02] flex items-center justify-center text-white/30">
                    <HiOutlinePlus className="text-sm" />
                  </div>
                  <span className="text-white/40 text-xs mt-1.5 font-medium leading-tight">
                    Open
                  </span>
                  <span className="text-[10px] text-white/20 leading-none mt-0.5">
                    Waiting
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Table Capacity Controls */}
          <div className="w-full mt-3 rounded-xl p-3 bg-white/[0.02] border border-white/5">
            {isHost ? (
              <div className="flex items-center justify-between">
                <span className="text-white/80 font-semibold text-xs">
                  Capacity
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateMaxPlayers(room.max_players - 1)}
                    disabled={room.max_players <= minAllowedPlayers}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold flex items-center justify-center text-xs disabled:opacity-25 transition-all border border-white/10"
                  >
                    <HiOutlineMinus />
                  </button>

                  <span className="font-mono font-bold text-xs text-cyan-200 px-2.5 py-1 rounded bg-slate-900 border border-white/10 min-w-[70px] text-center">
                    {room.max_players} Players
                  </span>

                  <button
                    type="button"
                    onClick={() => updateMaxPlayers(room.max_players + 1)}
                    disabled={room.max_players >= 10}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold flex items-center justify-center text-xs disabled:opacity-25 transition-all border border-white/10"
                  >
                    <HiOutlinePlus />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs font-medium">Capacity</span>
                <span className="font-mono font-bold text-xs text-white">
                  {room.max_players} Players
                </span>
              </div>
            )}

            {/* Subtle Progress Bar */}
            <div className="mt-2.5">
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (players.length / room.max_players) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full mt-4 flex items-center gap-2">
            {isHost ? (
              <>
                <button
                  onClick={cancelRoom}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-rose-500/15 active:scale-95 border border-white/10 hover:border-rose-500/30 text-white/70 hover:text-rose-200 font-display font-bold text-xs tracking-wider transition-all"
                >
                  CANCEL
                </button>

                <button
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-display font-bold text-xs tracking-wider active:scale-95 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5"
                >
                  {isStarting ? (
                    <span>STARTING...</span>
                  ) : (
                    <>
                      <HiPlay className="text-sm" />
                      <span>
                        {full
                          ? 'START GAME'
                          : botsNeeded > 0
                          ? `START (+${botsNeeded} BOTS)`
                          : 'START GAME'}
                      </span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={leaveRoom}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-rose-500/15 active:scale-95 border border-white/10 hover:border-rose-500/30 text-white/80 hover:text-rose-200 font-display font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                <HiOutlineLogout className="text-sm" />
                <span>LEAVE ROOM</span>
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
