import { memo } from 'react';
import { motion } from 'framer-motion';
import { GiCrown, GiDonkey } from 'react-icons/gi';
import { HiOutlineTrophy } from 'react-icons/hi2';
import { PlayerRow } from '../../types';
import { isBot } from '../../engine/bot';
import TurnStarburst from './TurnStarburst';

interface Props {
  player: PlayerRow;
  isTurn: boolean;
  isMe: boolean;
  isDonkeyCandidate: boolean;
  totalPlayers?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
}

function PlayerSeat({
  player,
  isTurn,
  isMe,
  isDonkeyCandidate,
  totalPlayers = 4,
  style,
  onClick,
}: Props) {
  const isVeryCrowded = totalPlayers >= 10;
  const isCrowded = totalPlayers >= 7;
  const isHuman = !isBot(player);

  // Proportional firework starburst sizing: comfortably bounded so it never overlaps cards, table or adjacent players
  const burstSizeClass = isVeryCrowded
    ? 'w-20 h-20 sm:w-26 sm:h-26'
    : isCrowded
    ? 'w-24 h-24 sm:w-30 sm:h-30'
    : 'w-28 h-28 sm:w-36 sm:h-36';

  return (
    <div
      style={style}
      onClick={onClick}
      className={`absolute flex flex-col items-center gap-0.5 sm:gap-1 -translate-x-1/2 -translate-y-1/2 z-10 select-none ${
        onClick
          ? 'pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-transform'
          : 'pointer-events-none'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Radiant Firework Starburst behind active player (replaces the blue circle) */}
        {isTurn && <TurnStarburst sizeClass={burstSizeClass} />}

        {/* Floating "PLAYING" Beacon Pill above the active player in Pure Gold */}
        {isTurn && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 3 }}
            animate={{ scale: [1, 1.08, 1], opacity: 1, y: [0, -4, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-5.5 sm:-top-6.5 z-30 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-[7.5px] sm:text-[9px] shadow-[0_0_16px_rgba(245,158,11,0.95)] uppercase tracking-wider whitespace-nowrap border border-white/80"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
            <span>PLAYING</span>
          </motion.div>
        )}

        {/* Floating Host Crown (centered like Waiting page) */}
        {player.is_host && (
          <span className="absolute -top-3 sm:-top-3.5 left-1/2 -translate-x-1/2 text-amber-300 text-sm sm:text-base drop-shadow-[0_2px_6px_rgba(245,158,11,0.8)] z-30">
            <GiCrown />
          </span>
        )}

        {/* 3D Orb Avatar (Exactly styled like the Waiting Room) */}
        <div
          className={`relative rounded-full flex items-center justify-center font-display font-black text-white transition-all overflow-hidden
            ${
              isVeryCrowded
                ? 'w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm'
                : isCrowded
                ? 'w-9 h-9 sm:w-12 sm:h-12 text-xs sm:text-base'
                : 'w-11 h-11 sm:w-13 sm:h-13 text-sm sm:text-lg'
            }
            ${
              isTurn
                ? 'border-2 border-white ring-4 ring-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.95),0_0_45px_rgba(251,191,36,0.65)]'
                : isMe
                ? 'border-2 border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_15px_rgba(56,189,248,0.5)]'
                : 'border-2 border-white/25 shadow-lg'
            }
            ${player.escaped ? 'opacity-40 grayscale' : ''}
            ${isDonkeyCandidate ? 'ring-4 ring-red-500 shadow-[0_0_16px_rgba(239,68,68,0.7)]' : ''}`}
          style={{
            background: `linear-gradient(135deg, ${player.avatar_color} 0%, #0f172a 120%)`,
            boxShadow: isTurn
              ? '0 0 24px rgba(245,158,11,0.95), inset 0 2px 4px rgba(255,255,255,0.7)'
              : isMe
              ? '0 0 15px rgba(56,189,248,0.5), inset 0 2px 4px rgba(255,255,255,0.5)'
              : `0 6px 16px -2px ${player.avatar_color}66, inset 0 2px 4px rgba(255,255,255,0.45)`,
          }}
        >
          {/* 3D Glass Sheen Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/45 pointer-events-none rounded-full" />

          {/* Avatar Initial */}
          <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            {player.name.slice(0, 1).toUpperCase()}
          </span>

          {/* Trophy on escape */}
          {player.escaped && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] sm:text-[10px] shadow border border-white/50 z-20">
              <HiOutlineTrophy />
            </span>
          )}

          {/* Donkey icon if candidate */}
          {isDonkeyCandidate && !player.escaped && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] sm:text-[10px] shadow border border-white/50 z-20">
              <GiDonkey />
            </span>
          )}
        </div>

        {/* Small Host / Bot Pill Tag (Positioned right on bottom of avatar like waiting room) */}
        {player.is_host ? (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[7px] sm:text-[8px] uppercase tracking-wider shadow z-20 whitespace-nowrap">
            HOST
          </span>
        ) : !isHuman ? (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-indigo-600 border border-indigo-400/50 text-white font-black text-[7px] sm:text-[8px] uppercase tracking-wider shadow z-20 whitespace-nowrap">
            BOT
          </span>
        ) : null}
      </div>

      {/* Unified Compact Name & Card Count Pill (Comfortable Width, no aggressive truncation) */}
      <div
        className={`flex items-center gap-1.5 glass rounded-full shadow-md transition-all border px-2 py-0.5 sm:px-2.5 sm:py-0.8 max-w-[85px] sm:max-w-[110px] mt-1 ${
          isTurn
            ? 'border-amber-400/90 bg-slate-950/95 ring-2 ring-amber-400/80 shadow-[0_0_14px_rgba(245,158,11,0.75)]'
            : isMe
            ? 'border-cyan-400/60 bg-slate-900/90 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
            : 'border-white/15 bg-slate-950/80'
        }`}
      >
        <span
          className={`font-bold truncate text-[9px] sm:text-xs ${
            isTurn ? 'text-amber-200 font-extrabold' : isMe ? 'text-cyan-300' : 'text-white'
          }`}
        >
          {player.name}
        </span>
        {isMe && (
          <span className="text-[6.5px] sm:text-[7.5px] bg-cyan-400 text-slate-950 font-black px-1 py-0.2 rounded uppercase shrink-0">
            YOU
          </span>
        )}
        {!player.escaped && (
          <span
            className={`rounded-full font-black text-[8px] sm:text-[9px] px-1.5 py-0.2 shrink-0 ${
              isTurn ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 text-slate-950 font-black shadow-sm' : 'bg-white/20 text-white'
            }`}
          >
            {player.cards.length}
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(PlayerSeat);

