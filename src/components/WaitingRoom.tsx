import { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineClipboard, HiOutlineCheck, HiOutlineShare, HiOutlineX, HiOutlineLogout } from 'react-icons/hi';
import { GiCrown } from 'react-icons/gi';
import { IoMicOff } from 'react-icons/io5';
import { useGameStore } from '../store/gameStore';
import { useVoiceStore } from '../store/voiceStore';
import FloatingCards from './common/FloatingCards';

export default function WaitingRoom() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore((s) => s.players);
  const myId = useGameStore((s) => s.myId);
  const startGame = useGameStore((s) => s.startGame);
  const cancelRoom = useGameStore((s) => s.cancelRoom);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const setToast = useGameStore((s) => s.setToast);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const myIsSpeaking = useVoiceStore((s) => s.isSpeaking);
  const myIsMuted = useVoiceStore((s) => s.isMuted);
  const peers = useVoiceStore((s) => s.peers);

  if (!room) return null;
  const me = players.find((p) => p.id === myId);
  const isHost = me?.is_host ?? false;
  const botsNeeded = Math.max(0, room.max_players - players.length);
  const canStart = isHost ? players.length >= 1 && room.max_players >= 4 : players.length >= 4;
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
      setToast('Room code copied!');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setToast('Could not copy — copy it manually.');
    }
  };

  const share = async () => {
    const text = `Join my ASS game! Room code: ${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ASS — Join my room', text });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      setToast('Invite copied to clipboard!');
    }
  };

  return (
    <div className="gradient-purple-blue min-h-[100dvh] relative flex flex-col justify-between safe-top safe-bottom overflow-y-auto">
      <FloatingCards />
      <div className="relative flex-1 flex flex-col items-center px-4 pt-4 sm:pt-6 pb-6 w-full max-w-sm mx-auto">
        <img
          src="/Ass Logo.png"
          alt="Ass Logo"
          className="w-14 sm:w-18 h-auto object-contain mb-1 drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
        />
        <h1 className="font-display font-extrabold text-white text-lg sm:text-xl tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
          WAITING ROOM
        </h1>

        <div className="glass rounded-2xl mt-4 w-full p-4 text-center">
          <p className="text-white/70 text-[11px] uppercase tracking-wider">Room Code</p>
          <div className="flex items-center justify-center gap-2.5 mt-0.5">
            <p className="font-display font-extrabold text-4xl sm:text-5xl text-white tracking-widest">{room.code}</p>
            <button
              onClick={copyCode}
              className="text-white/80 hover:text-white text-xl p-1 transition-colors active:scale-95"
              aria-label="Copy room code"
            >
              {copied ? <HiOutlineCheck className="text-emerald-300" /> : <HiOutlineClipboard />}
            </button>
          </div>
          <button
            onClick={share}
            className="mt-2.5 mx-auto flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-medium active:scale-95 transition-transform"
          >
            <HiOutlineShare /> Share invite
          </button>
        </div>

        <div className="w-full mt-4">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {players.map((p) => {
              const isPlayerMe = p.id === myId;
              const isSpeaking = isPlayerMe ? myIsSpeaking : peers[p.id]?.isSpeaking ?? false;
              const isMuted = isPlayerMe ? myIsMuted : peers[p.id]?.isMuted ?? false;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="relative">
                    {/* Voice speaking aura */}
                    {isSpeaking && (
                      <span className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none" />
                    )}

                    <div
                      className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center font-display font-bold text-white text-base sm:text-lg shadow-md transition-all ${
                        isSpeaking ? 'ring-2 ring-emerald-400' : ''
                      }`}
                      style={{ background: p.avatar_color }}
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>

                    {/* Muted mic badge */}
                    {isMuted && (
                      <span
                        className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] shadow border border-white/50"
                        title="Microphone muted"
                      >
                        <IoMicOff />
                      </span>
                    )}

                    {p.is_host && (
                      <span className="absolute -top-1.5 -right-1 text-amber-300 text-base drop-shadow">
                        <GiCrown />
                      </span>
                    )}
                    {isHost && p.id !== myId && (
                      <button
                        onClick={() => removePlayer(p.id)}
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] shadow"
                        aria-label={`Remove ${p.name}`}
                      >
                        <HiOutlineX />
                      </button>
                    )}
                  </div>
                  <p className="text-white text-[11px] font-medium truncate max-w-[70px] text-center leading-tight">
                    {p.name}
                    {p.is_host ? ' (Host)' : ''}
                  </p>
                </motion.div>
              );
            })}
            {Array.from({ length: Math.max(0, room.max_players - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex flex-col items-center gap-1 opacity-35">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 border-dashed border-white/40" />
                <p className="text-white/50 text-[10px]">Waiting</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full mt-4">
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all"
              style={{ width: `${(players.length / room.max_players) * 100}%` }}
            />
          </div>
          <p className="text-white/70 text-[11px] text-center mt-1.5 font-medium">
            {players.length}/{room.max_players} Players Joined
          </p>
        </div>

        <div className="w-full mt-5 flex gap-2.5">
          {isHost ? (
            <>
              <button
                onClick={cancelRoom}
                className="flex-1 rounded-xl py-3 font-display font-bold text-white text-xs sm:text-sm bg-red-500/90 active:scale-95 transition-transform shadow"
              >
                CANCEL ROOM
              </button>
              <button
                onClick={handleStartGame}
                disabled={!canStart || isStarting}
                className="flex-1 rounded-xl py-3 font-display font-bold text-white text-xs sm:text-sm btn-glow-blue disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                {isStarting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>STARTING...</span>
                  </>
                ) : full ? (
                  'START GAME'
                ) : botsNeeded > 0 ? (
                  `START (+${botsNeeded} BOT${botsNeeded > 1 ? 'S' : ''})`
                ) : (
                  'START GAME'
                )}
              </button>
            </>
          ) : (
            <button
              onClick={leaveRoom}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-display font-bold text-white text-xs sm:text-sm glass active:scale-95 transition-transform"
            >
              <HiOutlineLogout /> LEAVE ROOM
            </button>
          )}
        </div>
        {!canStart && (
          <p className="text-white/50 text-[11px] text-center mt-2.5">Need at least 4 player capacity to start.</p>
        )}
        {isHost && !full && canStart && (
          <p className="text-white/60 text-[10px] text-center mt-2">
            {botsNeeded > 0
              ? `${botsNeeded} bot${botsNeeded > 1 ? 's' : ''} will be added to fill the table.`
              : `Ready to start with ${players.length} players.`}
          </p>
        )}
      </div>
    </div>
  );
}
