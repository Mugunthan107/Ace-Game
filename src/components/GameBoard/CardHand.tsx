import { useState, useMemo } from 'react';
import { Card, Suit, SUIT_THEME } from '../../types';
import { legalCardIds } from '../../engine/gameRules';
import { sortHand } from '../../engine/deck';
import { useGameStore } from '../../store/gameStore';
import PlayingCard from './PlayingCard';

interface Props {
  hand: Card[];
  leadSuit: Suit | null;
  isMyTurn: boolean;
  onPlay: (card: Card) => void;
}

export default function CardHand({ hand, leadSuit, isMyTurn, onPlay }: Props) {
  // Always sort and group hand cards: Spades, Hearts, Clubs, Diamonds; within suit A -> 2
  const sortedHand = useMemo(() => sortHand(hand), [hand]);
  const legal = isMyTurn ? legalCardIds(sortedHand, leadSuit) : new Set<string>();
  const [isDragging, setIsDragging] = useState(false);
  const setToast = useGameStore((s) => s.setToast);

  // Calibrated for 13 cards maximum on mobile with clean breathing room and generous exposed card strips
  const overlapClass =
    sortedHand.length >= 12
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
      className={`relative w-full pb-3 pt-1.5 safe-bottom transition-colors duration-300 ${
        isMyTurn ? 'bg-sky-500/10' : ''
      }`}
    >
      {/* Hand status & action prompt */}
      <div className="flex items-center justify-between px-4 pb-1 text-[11px] sm:text-xs select-none">
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

      {/* Cards container with balanced left and right margins for a clean, professional look */}
      <div className="w-full px-3 sm:px-6">
        <div
          className={`flex ${overlapClass} overflow-x-auto max-w-full scrollbar-none py-2.5 px-3 justify-center items-end`}
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
            <div className="py-4 text-center w-full flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
              <span>🏆</span>
              <span>All cards cleared — you escaped!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
