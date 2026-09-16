import { useState, useEffect, useMemo } from 'react';
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

export default function CardHand({ hand, leadSuit, isMyTurn, onPlay }: Props) {
  // Always sort and group hand cards: Spades, Hearts, Clubs, Diamonds; within suit A -> 2
  const sortedHand = useMemo(() => sortHand(hand), [hand]);
  const legal = isMyTurn ? legalCardIds(sortedHand, leadSuit) : new Set<string>();
  const [isDragging, setIsDragging] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const setToast = useGameStore((s) => s.setToast);
  const isMobile = useIsMobile(640);

  // Calibrated for 13 cards maximum on mobile with clean breathing room and generous exposed card strips
  const overlapClass =
    sortedHand.length >= 12
      ? '-space-x-[25px] sm:-space-x-4'
      : sortedHand.length >= 9
      ? '-space-x-[21px] sm:-space-x-3'
      : sortedHand.length >= 6
      ? '-space-x-4 sm:-space-x-3'
      : '-space-x-2 sm:-space-x-2';

  // Inverted U arch layout applies strictly to mobile view when player has > 13 cards
  const isMobileArch = isMobile && sortedHand.length > 13;

  const handleCardClick = (card: Card) => {
    if (!isMyTurn) return;
    if (legal.has(card.id)) {
      onPlay(card);
    } else if (leadSuit) {
      setToast(`Must follow ${SUIT_THEME[leadSuit].name.toUpperCase()} ${SUIT_THEME[leadSuit].symbol}`);
    }
  };

  const cardCount = sortedHand.length;
  // Adaptive scaling so 14 to 26+ cards fit comfortably without index occlusion
  const cardScale = Math.max(0.78, Math.min(1, 1 - (cardCount - 13) * 0.012));

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

      {/* Cards container */}
      <div className="w-full px-2 sm:px-6">
        {/* Mobile Inverted U Arch Layout: active only on mobile when cards > 13 */}
        {isMobileArch ? (
          <div className="relative w-full h-[116px] mx-auto select-none overflow-visible py-1 sm:hidden">
            {sortedHand.map((card, idx) => {
              const isLegal = legal.has(card.id);
              const isCardActive = activeCardId === card.id;

              // Normalized curve index: -1.0 (leftmost), 0.0 (center apex), +1.0 (rightmost)
              const t = cardCount > 1 ? idx / (cardCount - 1) : 0.5;
              const norm = (t - 0.5) * 2;

              // Percentage-based horizontal distribution across 8% to 92% of container width
              const leftPercent = 8 + t * 84;

              // Inverted U arch elevation: apex at center (norm = 0), drops down by 24px at the sides
              const archDrop = Math.pow(norm, 2) * 24;

              // Radial fanning rotation: tilts from -22deg on the left to +22deg on the right
              const rotation = norm * 22;

              return (
                <div
                  key={card.id}
                  className="absolute pointer-events-auto transition-transform duration-200"
                  style={{
                    left: `${leftPercent}%`,
                    bottom: '26px',
                    transform: `translateX(-50%) translateY(${archDrop - (isCardActive ? 18 : 0)}px) rotate(${rotation}deg) scale(${
                      isCardActive ? cardScale * 1.12 : cardScale
                    })`,
                    transformOrigin: '50% 120%',
                    zIndex: isCardActive ? 60 : idx + 1,
                  }}
                  onMouseEnter={() => setActiveCardId(card.id)}
                  onMouseLeave={() => setActiveCardId((curr) => (curr === card.id ? null : curr))}
                  onTouchStart={() => setActiveCardId(card.id)}
                  onTouchEnd={() => setActiveCardId((curr) => (curr === card.id ? null : curr))}
                >
                  <PlayingCard
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
                    className="shrink-0 shadow-md"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* Standard Row Layout: used on desktop for all counts, and on mobile for <= 13 cards */
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
        )}
      </div>
    </div>
  );
}
