import { useState, useEffect, useMemo } from 'react';
import { Card, Suit, SUIT_THEME } from '../../types';
import { legalCardIds } from '../../engine/gameRules';
import { sortHand } from '../../engine/deck';
import { useGameStore } from '../../store/gameStore';
import PlayingCard from './PlayingCard';

interface Props {
  hand: Card[];
  leadSuit: Suit | null;
  roundNumber?: number;
  isMyTurn: boolean;
  onPlay: (card: Card) => void;
  escaped?: boolean;
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

export default function CardHand({ hand, leadSuit, roundNumber, isMyTurn, onPlay, escaped }: Props) {
  // Always sort and group hand cards: Spades, Hearts, Clubs, Diamonds; within suit A -> 2
  const sortedHand = useMemo(() => sortHand(hand), [hand]);
  const legal = isMyTurn ? legalCardIds(sortedHand, leadSuit, roundNumber) : new Set<string>();
  const [isDragging, setIsDragging] = useState(false);
  const setToast = useGameStore((s) => s.setToast);
  const isMobile = useIsMobile(640);

  // Multi-row configuration:
  // Mobile: splits into 13 cards per row when hand > 13
  // Desktop: splits into 26 cards per row when hand > 26
  const isMultiRow = isMobile ? sortedHand.length > 13 : sortedHand.length > 26;
  const chunkSize = isMobile ? 13 : 26;

  // Split sorted cards into chunks for multi-row display
  const cardRows = useMemo(() => {
    if (!isMultiRow) {
      return [sortedHand];
    }
    const rows: Card[][] = [];
    for (let i = 0; i < sortedHand.length; i += chunkSize) {
      rows.push(sortedHand.slice(i, i + chunkSize));
    }
    return rows;
  }, [sortedHand, isMultiRow, chunkSize]);

  // Overlap per row on mobile multi-row based on card count in row
  const getMobileRowOverlapClass = (count: number) => {
    if (count >= 12) return '-space-x-[20px]';
    if (count >= 9) return '-space-x-[16px]';
    if (count >= 6) return '-space-x-3.5';
    if (count >= 3) return '-space-x-3';
    return '-space-x-2';
  };

  // Overlap per row on desktop multi-row based on card count in row
  const getDesktopRowOverlapClass = (count: number) => {
    if (count >= 24) return 'sm:-space-x-[34px]';
    if (count >= 18) return 'sm:-space-x-[28px]';
    if (count >= 12) return 'sm:-space-x-7';
    if (count >= 6) return 'sm:-space-x-5';
    if (count >= 3) return 'sm:-space-x-4';
    return 'sm:-space-x-3';
  };

  // Standard overlap for single-row layouts (Mobile <= 13, Desktop <= 26)
  const defaultOverlapClass =
    sortedHand.length >= 24
      ? '-space-x-[34px] sm:-space-x-[32px]'
      : sortedHand.length >= 18
      ? '-space-x-[28px] sm:-space-x-6'
      : sortedHand.length >= 12
      ? '-space-x-[25px] sm:-space-x-4'
      : sortedHand.length >= 9
      ? '-space-x-[21px] sm:-space-x-3'
      : sortedHand.length >= 6
      ? '-space-x-4 sm:-space-x-3'
      : '-space-x-2 sm:-space-x-2';

  const handleCardClick = (card: Card) => {
    if (!isMyTurn) return;
    if (legal.has(card.id)) {
      onPlay(card);
    } else if (leadSuit) {
      setToast(`Must follow ${SUIT_THEME[leadSuit].name.toUpperCase()} ${SUIT_THEME[leadSuit].symbol}`);
    }
  };

  return (
    <div
      className={`relative w-full ${
        isMultiRow ? 'pb-2 pt-1' : 'pb-3 pt-1.5'
      } safe-bottom transition-colors duration-300 ${
        isMyTurn ? 'bg-sky-500/10' : ''
      }`}
    >
      {/* Hand status & action prompt */}
      <div className="flex items-center justify-between px-3 pb-0.5 text-[11px] sm:text-xs select-none">
        <div className="flex items-center gap-1.5 font-bold text-white/75">
          <span className="text-sky-400">Your Hand</span>
          <span className="text-white/40">•</span>
          <span className="bg-white/10 px-2 py-0.5 rounded-full text-white text-[10px]">
            {sortedHand.length} {sortedHand.length === 1 ? 'card' : 'cards'}
          </span>
        </div>

        {isMyTurn ? (
          <div className="flex items-center gap-1 text-[11px] font-bold text-sky-300 animate-pulse">
            <span className="text-sky-400 font-extrabold">↑</span>
            <span>{isDragging ? 'Release to discard' : 'Tap or drag up to play'}</span>
          </div>
        ) : (
          <span className="text-white/40 text-[10px] font-medium">Waiting for turn...</span>
        )}
      </div>

      {/* Cards container */}
      <div className="w-full px-1.5 sm:px-6">
        {/* Multi-Row Layout: active on Mobile when > 13 cards, Desktop when > 26 cards */}
        {isMultiRow ? (
          <div
            className={`flex flex-col items-center justify-center ${
              isMobile ? '-space-y-1.5 py-1' : '-space-y-4 py-2'
            } w-full select-none`}
          >
            {cardRows.map((rowCards, rowIndex) => {
              const rowOverlap = isMobile
                ? getMobileRowOverlapClass(rowCards.length)
                : getDesktopRowOverlapClass(rowCards.length);

              return (
                <div
                  key={`row-${rowIndex}`}
                  className={`flex ${rowOverlap} justify-center items-center py-0.5 w-full`}
                  style={{ zIndex: rowIndex + 1 }}
                >
                  {rowCards.map((card, idx) => {
                    const isLegal = legal.has(card.id);
                    const globalIdx = rowIndex * chunkSize + idx;
                    return (
                      <PlayingCard
                        key={card.id}
                        card={card}
                        size={isMobile ? 'compact' : 'lg'}
                        floating={isMyTurn && isLegal}
                        floatDelay={(globalIdx % 6) * 0.1}
                        draggable={isMyTurn && isLegal}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={(_e, info) => {
                          setIsDragging(false);
                          if (info.offset.y < -45 || info.velocity.y < -150) {
                            onPlay(card);
                          }
                        }}
                        onClick={() => handleCardClick(card)}
                        className="shrink-0 transition-transform hover:z-50 focus:z-50"
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          /* Standard Row Layout: used on desktop for <= 26 cards, and on mobile for <= 13 cards */
          <div
            className={`flex ${defaultOverlapClass} overflow-x-auto max-w-full scrollbar-none py-2.5 px-3 justify-center items-end`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {sortedHand.map((card, idx) => {
              const isLegal = legal.has(card.id);
              return (
                <PlayingCard
                  key={card.id}
                  card={card}
                  size="lg"
                  floating={isMyTurn && isLegal}
                  floatDelay={(idx % 6) * 0.1}
                  draggable={isMyTurn && isLegal}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={(_e, info) => {
                    setIsDragging(false);
                    if (info.offset.y < -45 || info.velocity.y < -150) {
                      onPlay(card);
                    }
                  }}
                  onClick={() => handleCardClick(card)}
                  className="shrink-0 transition-transform"
                />
              );
            })}

            {sortedHand.length === 0 && (
              <div className="py-4 text-center w-full flex items-center justify-center gap-2 font-bold text-sm">
                {escaped ? (
                  <>
                    <span>🏆</span>
                    <span className="text-emerald-400">All cards cleared — you escaped!</span>
                  </>
                ) : (
                  <>
                    <span>⏳</span>
                    <span className="text-sky-300 animate-pulse">Card played — waiting for round result...</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
