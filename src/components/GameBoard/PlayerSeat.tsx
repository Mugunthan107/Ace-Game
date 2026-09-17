import { motion } from 'framer-motion';
import { GiCrown, GiDonkey } from 'react-icons/gi';
import { HiOutlineTrophy } from 'react-icons/hi2';
import { IoMicOff } from 'react-icons/io5';
import { PlayerRow } from '../../types';
import { isBot } from '../../engine/bot';
import { useVoiceStore } from '../../store/voiceStore';

interface Props {
  player: PlayerRow;
  isTurn: boolean;
  isMe: boolean;
  isDonkeyCandidate: boolean;
  totalPlayers?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export default function PlayerSeat({
  player,
  isTurn,
  isMe,
  isDonkeyCandidate,
  totalPlayers = 4,
  style,
  onClick,
}: Props) {
  const isCrowded = totalPlayers >= 7;

  const myIsSpeaking = useVoiceStore((s) => s.isSpeaking);
  const myIsMuted = useVoiceStore((s) => s.isMuted);
  const peerVoice = useVoiceStore((s) => s.peers[player.id]);

  const isPlayerSpeaking = !isBot(player) && (isMe ? myIsSpeaking : peerVoice?.isSpeaking ?? false);
  const isPlayerMuted = !isBot(player) && (isMe ? myIsMuted : peerVoice?.isMuted ?? false);

  return (
    <div
      style={style}
      onClick={onClick}
      className={`absolute flex flex-col items-center gap-0.5 sm:gap-1 -translate-x-1/2 -translate-y-1/2 z-10 select-none ${
        onClick
          ? 'pointer-events-auto cursor-pointer hover:scale-110 active:scale-95 transition-transform'
          : 'pointer-events-none'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Radiant Turn Glowing Auras & Expanding Radar Waves */}
        {isTurn && (
          <>
            {/* Outer expanding radar pulse waves */}
            <span className="absolute -inset-2.5 sm:-inset-3 rounded-full border-2 border-sky-400 animate-[turn-radar_1.8s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" />
            <span className="absolute -inset-1.5 sm:-inset-2 rounded-full border border-cyan-300 animate-[turn-radar_1.8s_cubic-bezier(0,0,0.2,1)_0.6s_infinite] pointer-events-none" />

            {/* Radiant ambient glow halo */}
            <span className="absolute -inset-3.5 sm:-inset-4.5 rounded-full bg-gradient-to-r from-sky-400/60 via-cyan-300/70 to-blue-500/60 blur-lg animate-pulse pointer-events-none" />
          </>
        )}

        {/* Floating "PLAYING" Beacon Pill above the active player */}
        {isTurn && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 3 }}
            animate={{ scale: [1, 1.08, 1], opacity: 1, y: [0, -4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-5.5 sm:-top-6.5 z-30 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-400 text-slate-950 font-black text-[7px] sm:text-[9px] shadow-[0_0_14px_rgba(56,189,248,0.9)] uppercase tracking-wider whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
            <span>PLAYING</span>
          </motion.div>
        )}

        <div
          className={`relative rounded-full flex items-center justify-center font-display font-bold text-white transition-all
            ${isCrowded ? 'w-8 h-8 sm:w-11 sm:h-11 text-xs sm:text-sm' : 'w-9 h-9 sm:w-12 sm:h-12 text-xs sm:text-base'}
            ${
              isTurn
                ? 'border-2 border-white ring-4 ring-sky-300 shadow-[0_0_25px_rgba(56,189,248,1),0_0_50px_rgba(14,165,233,0.7)] animate-turn-glow'
                : isMe
                ? 'border-2 border-sky-400/80 ring-2 ring-sky-400/40 shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                : 'border-2 border-white/25 shadow-lg'
            }
            ${player.escaped ? 'opacity-40 grayscale' : ''}
            ${isDonkeyCandidate ? 'ring-4 ring-red-500 shadow-[0_0_16px_rgba(239,68,68,0.7)]' : ''}`}
          style={{ background: player.avatar_color }}
        >
          {player.name.slice(0, 1).toUpperCase()}

          {/* Bot indicator */}
          {isBot(player) && (
            <span
              className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full bg-slate-900 text-sky-300 flex items-center justify-center text-[8px] sm:text-[9px] shadow border border-sky-400/40"
              title="Bot"
            >
              🤖
            </span>
          )}

          {/* Voice: Speaking wave ping */}
          {isPlayerSpeaking && (
            <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none" />
          )}

          {/* Voice: Muted microphone badge */}
          {isPlayerMuted && (
            <span
              className="absolute -bottom-1 -left-1 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[7px] sm:text-[8px] shadow border border-white/50 z-20"
              title="Muted"
            >
              <IoMicOff />
            </span>
          )}

          {/* Host crown */}
          {player.is_host && (
            <span className="absolute -top-2.5 -right-1 text-amber-300 text-xs sm:text-sm drop-shadow">
              <GiCrown />
            </span>
          )}

          {/* Trophy on escape */}
          {player.escaped && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] sm:text-[9px] shadow border border-white/50">
              <HiOutlineTrophy />
            </span>
          )}

          {/* Donkey icon if candidate */}
          {isDonkeyCandidate && !player.escaped && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] sm:text-[9px] shadow border border-white/50">
              <GiDonkey />
            </span>
          )}
        </div>
      </div>

      {/* Unified Compact Name & Card Count Pill */}
      <div
        className={`flex items-center gap-1 glass rounded-full shadow-sm transition-all border ${
          isCrowded ? 'px-1.5 py-0.5 max-w-[68px] sm:max-w-[88px]' : 'px-2 py-0.5 max-w-[78px] sm:max-w-[96px]'
        } ${
          isTurn
            ? 'border-sky-300 bg-sky-950/95 ring-2 ring-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.7)]'
            : isMe
            ? 'border-sky-400/50 bg-sky-950/60'
            : 'border-white/15'
        }`}
      >
        <span
          className={`font-semibold truncate ${
            isCrowded ? 'text-[8px] sm:text-[11px]' : 'text-[9px] sm:text-xs'
          } ${
            isTurn ? 'text-sky-200 font-extrabold' : isMe ? 'text-sky-300' : 'text-white'
          }`}
        >
          {player.name}
        </span>
        {isMe && (
          <span className="text-[7px] sm:text-[8px] bg-sky-400 text-slate-950 font-black px-1 rounded uppercase shrink-0">
            YOU
          </span>
        )}
        {!player.escaped && (
          <span
            className={`rounded-full px-1.5 py-[0.5px] font-extrabold shrink-0 ${
              isCrowded ? 'text-[7px] sm:text-[8px]' : 'text-[8px] sm:text-[9px]'
            } ${
              isTurn ? 'bg-sky-400 text-slate-950' : 'bg-white/20 text-white'
            }`}
          >
            {player.cards.length}
          </span>
        )}
      </div>
    </div>
  );
}
