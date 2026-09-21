import { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineClipboard, HiOutlineCheck, HiOutlineShare, HiOutlineX, HiOutlineLogout } from 'react-icons/hi';
import { GiCrown } from 'react-icons/gi';
import { BsMicFill, BsMicMuteFill } from 'react-icons/bs';
import { useGameStore } from '../store/gameStore';
import { useVoiceStore } from '../store/voiceStore';
import { PlayerRow } from '../types';
import FloatingCards from './common/FloatingCards';
import VoiceControlBar from './common/VoiceControlBar';

interface SeatItemProps {
  p: PlayerRow;
  isHost: boolean;
  myId: string | null;
  onRemove: (id: string) => void;
}

const WaitingSeatItem = memo(function WaitingSeatItem({ p, isHost, myId, onRemove }: SeatItemProps) {
  const isPlayerMe = p.id === myId;
  const isLocalMicOn = useVoiceStore((s) => s.isMicOn);
  const isLocalSpeaking = useVoiceStore((s) => s.isSpeaking);
  const remoteVoice = useVoiceStore((s) => (isPlayerMe ? null : s.remotePlayers[p.id]));

  const pMicOn = isPlayerMe ? isLocalMicOn : (remoteVoice?.isMicOn ?? false);
  const pSpeaking = isPlayerMe ? isLocalSpeaking : (remoteVoice?.isSpeaking ?? false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center w-[64px] sm:w-[70px]"
    >
      <div className="relative">
        {/* Speaking radial pulse */}
        {pSpeaking && (
          <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 animate-ping opacity-75 pointer-events-none" />
        )}

        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-display font-extrabold text-white text-base shadow-lg transition-all ${
            pSpeaking
              ? 'ring-4 ring-emerald-400 border-2 border-emerald-300'
              : 'border-2 border-white/20'
          }`}
          style={{ background: p.avatar_color }}
        >
          {p.name.slice(0, 1).toUpperCase()}
        </div>

        {/* Mic status badge */}
        {!p.is_bot && (
          <span
            className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] shadow-md border transition-colors ${
              pSpeaking
                ? 'bg-emerald-500 text-slate-950 border-white ring-2 ring-emerald-300 animate-pulse'
                : pMicOn
                ? 'bg-emerald-600 text-white border-white/80'
                : 'bg-rose-600 text-white border-white/80'
            }`}
            title={pSpeaking ? `${p.name} speaking` : pMicOn ? 'Mic ON' : 'Mic OFF'}
          >
            {pMicOn ? <BsMicFill /> : <BsMicMuteFill />}
          </span>
        )}

        {/* Crown for Host */}
        {p.is_host && (
          <span className="absolute -top-2 -right-1 text-amber-300 text-base drop-shadow-[0_2px_6px_rgba(245,158,11,0.6)]">
            <GiCrown />
          </span>
        )}

        {/* Remove player button (Host only) */}
        {isHost && p.id !== myId && (
          <button
            onClick={() => onRemove(p.id)}
            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-[8px] sm:text-[9px] shadow transition-colors"
            aria-label={`Remove ${p.name}`}
            title={`Remove ${p.name}`}
          >
            <HiOutlineX />
          </button>
        )}
      </div>

      <p className="text-white text-[11px] font-semibold truncate max-w-[64px] sm:max-w-[70px] text-center mt-1 leading-tight">
        {p.name}
      </p>
      <span className="text-[9px] text-cyan-300/80 font-medium leading-none mt-0.5">
        {p.is_host ? 'Host' : p.is_bot ? 'Bot' : 'Player'}
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

  const initVoice = useVoiceStore((s) => s.initVoice);

  const me = players.find((p) => p.id === myId);

  useEffect(() => {
    if (room?.id && me?.id) {
      initVoice(room.id, me.id, me.name);
    }
  }, [room?.id, me?.id, me?.name, initVoice]);

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
      setToast('Room code copied!');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setToast('Could not copy — copy it manually.');
    }
  };

  const share = async () => {
    const text = `Join my Donkey game! Room code: ${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Donkey — Join my room', text });
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
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-5 sm:py-7 w-full max-w-md mx-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-3">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-xl pointer-events-none" />
            <img
              src="/Ass Logo.png"
              alt="Ass Logo"
              className="w-14 sm:w-16 h-auto object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.6)] relative z-10"
            />
          </div>
          <h1 className="font-display font-black text-lg sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-sky-200 tracking-wider uppercase mt-1 drop-shadow-[0_2px_10px_rgba(0,210,255,0.3)]">
            GAME LOBBY
          </h1>
        </div>

        {/* Master Glass Lobby Card */}
        <div className="w-full glass rounded-3xl p-4 sm:p-5 border border-cyan-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden backdrop-blur-2xl">
          
          {/* Room Code & Quick Actions Header */}
          <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-cyan-400/90 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase block">
                Room Code
              </span>
              <span className="font-mono font-black text-2xl sm:text-3xl text-white tracking-widest drop-shadow-[0_0_12px_rgba(0,210,255,0.4)]">
                {room.code}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 text-white text-xs font-semibold transition-all shadow-sm"
                title="Copy Room Code"
              >
                {copied ? (
                  <>
                    <HiOutlineCheck className="text-emerald-400 text-sm" />
                    <span className="text-emerald-300 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <HiOutlineClipboard className="text-cyan-300 text-sm" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={share}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 border border-cyan-500/30 text-cyan-200 text-xs font-semibold transition-all shadow-sm"
                title="Share Invite Link"
              >
                <HiOutlineShare className="text-sm" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Voice Communication Bar */}
          <div className="w-full mt-3 flex justify-center">
            <VoiceControlBar compact />
          </div>

          {/* Players Arena / Seats Roster */}
          <div className="w-full bg-slate-950/40 border border-white/5 rounded-2xl p-3 sm:p-4 mt-3">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/80 font-display">
                  Table Seats
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                {players.length} / {room.max_players} Joined
              </span>
            </div>

            {/* Centered Flex Grid of Player Seats */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 py-1">
              {players.map((p) => (
                <WaitingSeatItem
                  key={p.id}
                  p={p}
                  isHost={isHost}
                  myId={myId}
                  onRemove={removePlayer}
                />
              ))}

              {/* Waiting open slots */}
              {Array.from({ length: Math.max(0, room.max_players - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex flex-col items-center w-[64px] sm:w-[70px] opacity-40">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-white/35 bg-white/[0.02] flex items-center justify-center text-white/40">
                    <span className="text-xs font-light">+</span>
                  </div>
                  <p className="text-white/60 text-[11px] font-medium mt-1 leading-tight">Waiting</p>
                  <span className="text-[9px] text-white/30 leading-none mt-0.5">Open</span>
                </div>
              ))}
            </div>
          </div>

          {/* Room Capacity & Stepper Section */}
          <div className="w-full mt-3">
            {isHost ? (
              <div className="bg-slate-950/60 border border-white/10 rounded-2xl px-3.5 py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold text-xs sm:text-sm block">Target Players</span>
                  <span className="text-cyan-300/80 text-[10px] sm:text-[11px]">Adjust table capacity</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateMaxPlayers(room.max_players - 1)}
                    disabled={room.max_players <= minAllowedPlayers}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black flex items-center justify-center text-sm sm:text-base disabled:opacity-25 disabled:pointer-events-none transition-all border border-white/10"
                    title="Decrease capacity"
                  >
                    −
                  </button>

                  <div className="relative">
                    <select
                      value={room.max_players}
                      onChange={(e) => updateMaxPlayers(Number(e.target.value))}
                      className="appearance-none bg-slate-900 border border-cyan-500/40 rounded-xl px-2.5 py-1 sm:py-1.5 pr-6 text-xs font-bold text-cyan-200 outline-none cursor-pointer focus:ring-2 focus:ring-cyan-400"
                    >
                      {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                        <option
                          key={n}
                          value={n}
                          disabled={n < players.length}
                          className="bg-slate-900 text-white"
                        >
                          {n} Players {n < players.length ? '(joined)' : ''}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-cyan-400 pointer-events-none">
                      ▼
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateMaxPlayers(room.max_players + 1)}
                    disabled={room.max_players >= 10}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black flex items-center justify-center text-sm sm:text-base disabled:opacity-25 disabled:pointer-events-none transition-all border border-white/10"
                    title="Increase capacity"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-white/5 rounded-xl px-3 py-2 text-center">
                <span className="text-xs text-cyan-200/90 font-medium">
                  Room Capacity: <strong className="text-white">{room.max_players} Players</strong> (set by host)
                </span>
              </div>
            )}

            {/* Capacity Progress Bar */}
            <div className="mt-2.5 px-0.5">
              <div className="h-1.5 rounded-full bg-slate-950 border border-white/10 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (players.length / room.max_players) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full mt-4 flex gap-2.5 sm:gap-3">
            {isHost ? (
              <>
                <button
                  onClick={cancelRoom}
                  className="flex-1 rounded-2xl py-3 sm:py-3.5 font-display font-bold text-xs sm:text-sm bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 active:scale-95 transition-all shadow-sm"
                >
                  CANCEL ROOM
                </button>
                <button
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                  className="flex-1 rounded-2xl py-3 sm:py-3.5 font-display font-extrabold text-xs sm:text-sm bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-white disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-[0_0_25px_rgba(56,189,248,0.4)] flex items-center justify-center gap-1.5"
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
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 sm:py-3.5 font-display font-bold text-white text-xs sm:text-sm bg-white/10 hover:bg-white/15 border border-white/15 active:scale-95 transition-all"
              >
                <HiOutlineLogout className="text-base" /> LEAVE ROOM
              </button>
            )}
          </div>

          {/* Helper caption below buttons */}
          {!canStart && (
            <p className="text-rose-300/80 text-[11px] text-center mt-2.5 font-medium">
              Need at least 2 player capacity to start.
            </p>
          )}
          {isHost && canStart && (
            <p className="text-cyan-200/70 text-[11px] text-center mt-2.5 font-medium">
              {botsNeeded > 0
                ? `${botsNeeded} bot${botsNeeded > 1 ? 's' : ''} will be added to fill the table.`
                : full
                ? 'All player slots are filled! Ready to play.'
                : `Ready to start with ${players.length} players.`}
            </p>
          )}
          {!isHost && (
            <p className="text-white/50 text-[11px] text-center mt-2.5">
              Waiting for host to start the game...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
