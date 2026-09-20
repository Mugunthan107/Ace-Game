import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Suit, TrickCard, rankValue, SUIT_THEME } from '../../types';
import PlayingCard from './PlayingCard';
import SuitIcon from '../common/SuitIcon';

interface Props {
  centerPile: TrickCard[];
  lastRoundPile?: TrickCard[];
  hitPlayerId: string | null;
  collectorId?: string | null;
  leadSuit?: Suit | null;
  roundNumber?: number;
  isMyTurn?: boolean;
}

export default function CenterPile({
  centerPile,
  lastRoundPile = [],
  hitPlayerId,
  collectorId,
  leadSuit,
  roundNumber = 1,
  isMyTurn,
}: Props) {
  // Identify the highest lead-suit card in this trick
  const highestLeadCard = useMemo(() => {
    if (!leadSuit || centerPile.length === 0) return null;
    const leadCards = centerPile.filter((tc) => tc.card.suit === leadSuit);
    if (leadCards.length === 0) return null;
    return leadCards.reduce((best, cur) =>
      rankValue(cur.card.rank) > rankValue(best.card.rank) ? cur : best
    );
  }, [centerPile, leadSuit]);

  const hasCurrentCards = centerPile.length > 0;
  const hasPreviousCards = !hasCurrentCards && lastRoundPile.length > 0;

  return (
    <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 w-auto min-w-[155px] max-w-[205px] sm:max-w-[230px]">
      <div
        className={`transition-all duration-300 pointer-events-auto rounded-2xl sm:rounded-3xl bg-slate-950/90 border backdrop-blur-md shadow-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center w-full min-h-[95px] sm:min-h-[110px] ${
          isMyTurn
            ? 'border-sky-400/60 ring-2 ring-sky-400/30 shadow-[0_0_25px_rgba(56,189,248,0.25)]'
            : 'border-white/10'
        }`}
      >
        {/* Discard Tray Header */}
        <div className="flex items-center justify-between w-full px-1 pb-1 text-[8px] sm:text-[10px] text-white/70 border-b border-white/10 select-none">
          <span className="font-extrabold tracking-wider text-sky-400 uppercase">
            Round {roundNumber}
          </span>

          {hasPreviousCards ? (
            <span className="text-amber-300/90 font-bold text-[7px] sm:text-[9px] uppercase tracking-wide">
              Last Discards
            </span>
          ) : leadSuit ? (
            <span
              className={`font-extrabold flex items-center gap-1 px-1.5 py-0.5 rounded-full border shadow-sm ${SUIT_THEME[leadSuit].bgBadgeClass}`}
            >
              <span className="opacity-75 text-[7px] sm:text-[8px] uppercase tracking-wider">Lead:</span>
              <SuitIcon suit={leadSuit} className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wide">
                {SUIT_THEME[leadSuit].name}
              </span>
            </span>
          ) : (
            <span className="text-white/50 italic text-[7px] sm:text-[9px]">Waiting for lead</span>
          )}

          <span className="text-white/60 font-medium text-[7px] sm:text-[9px]">
            {hasCurrentCards ? `${centerPile.length} cards` : hasPreviousCards ? `${lastRoundPile.length} cards` : 'Table open'}
          </span>
        </div>

        {/* Current Round Discards — wrapped into neat rows that never exceed safe width */}
        {hasCurrentCards ? (
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap py-1 w-full">
            <AnimatePresence>
              {centerPile.map((tc, i) => {
                const isLead = i === 0;
                const isHit = tc.playerId === hitPlayerId;
                const isBiggest =
                  hitPlayerId !== null && collectorId
                    ? tc.playerId === collectorId
                    : tc === highestLeadCard;

                return (
                  <motion.div
                    key={`${tc.playerId}-${tc.card.id}`}
                    initial={{ opacity: 0, y: -20, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5, y: 15 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="flex flex-col items-center relative my-0.5 shrink-0"
                  >
                    {/* Role Badges */}
                    {isHit ? (
                      <span className="absolute -top-2 z-30 bg-rose-600 text-white font-extrabold text-[6px] sm:text-[7px] px-1.5 py-0.5 rounded-full shadow-lg border border-white/40 tracking-wider uppercase animate-bounce">
                        HIT!
                      </span>
                    ) : isBiggest ? (
                      <span className="absolute -top-2 z-30 bg-amber-400 text-slate-950 font-extrabold text-[6px] sm:text-[7px] px-1.5 py-0.5 rounded-full shadow-lg border border-amber-200 tracking-wider uppercase">
                        BIGGEST
                      </span>
                    ) : isLead ? (
                      <span className="absolute -top-2 z-30 bg-sky-500 text-white font-bold text-[6px] sm:text-[7px] px-1.5 py-0.5 rounded-full shadow border border-white/30 tracking-wider uppercase">
                        LEAD
                      </span>
                    ) : null}

                    <PlayingCard
                      card={tc.card}
                      size="sm"
                      className={`transition-all duration-300 ${
                        isHit
                          ? 'animate-shake ring-2 ring-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]'
                          : isBiggest
                          ? 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                          : 'shadow-md'
                      }`}
                    />

                    {/* Player label below card */}
                    <span
                      className={`mt-0.5 text-[7px] sm:text-[8px] font-bold rounded-full px-1.5 py-0.2 truncate max-w-[42px] sm:max-w-[48px] shadow-sm ${
                        isHit
                          ? 'bg-rose-950/90 text-rose-200 border border-rose-500/40'
                          : isBiggest
                          ? 'bg-amber-950/90 text-amber-200 border border-amber-400/40'
                          : 'bg-slate-900 text-white/90 border border-white/10'
                      }`}
                    >
                      {tc.playerName}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : hasPreviousCards ? (
          /* When new round just started: show previous round's discards neatly grouped without overlap */
          <div className="w-full flex flex-col items-center py-1">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap max-w-full opacity-90 my-0.5">
              {lastRoundPile.map((tc) => (
                <div
                  key={`prev-${tc.playerId}-${tc.card.id}`}
                  className="flex flex-col items-center scale-90 sm:scale-95 my-0.5"
                >
                  <PlayingCard card={tc.card} size="sm" className="shadow-md" />
                  <span className="mt-0.5 text-[7px] sm:text-[8px] text-white/80 font-medium truncate max-w-[42px] sm:max-w-[46px]">
                    {tc.playerName}
                  </span>
                </div>
              ))}
            </div>
            <span
              className={`mt-1 text-[8.5px] sm:text-[10px] font-semibold text-center leading-tight ${
                isMyTurn ? 'text-sky-300 animate-pulse' : 'text-white/40'
              }`}
            >
              {isMyTurn ? 'Your turn — lead card' : 'Waiting for round leader to discard...'}
            </span>
          </div>
        ) : (
          /* Fresh game state */
          <div className="py-3 sm:py-4 text-center">
            <span
              className={`text-[10px] sm:text-[11px] font-medium tracking-wide ${
                isMyTurn ? 'text-sky-300 font-bold animate-pulse' : 'text-white/40'
              }`}
            >
              {isMyTurn ? '🂡 Drop Ace of Spades here to lead!' : 'Waiting for Ace of Spades lead...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
