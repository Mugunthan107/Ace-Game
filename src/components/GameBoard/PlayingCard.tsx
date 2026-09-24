import { PanInfo, TargetAndTransition, motion } from 'framer-motion';
import { Card, SUIT_THEME } from '../../types';
import SuitIcon from '../common/SuitIcon';

interface Props {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'compact';
  selected?: boolean;
  floating?: boolean;
  floatDelay?: number;
  glow?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const SIZES = {
  sm: 'w-8 h-11 text-[9px]',
  md: 'w-10 h-14 text-[10px] sm:w-12 sm:h-16 sm:text-xs',
  compact: 'w-[31px] min-[390px]:w-[33px] min-[430px]:w-[36px] h-[48px] min-[390px]:h-[50px] min-[430px]:h-[54px] sm:w-16 sm:h-[5.5rem]',
  lg: 'w-13 h-[4.75rem] text-xs sm:w-16 sm:h-[5.5rem] sm:text-sm',
};

const ICON_SIZES = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
  compact: 'w-2.5 h-2.5 min-[390px]:w-3 min-[390px]:h-3 sm:w-5 sm:h-5',
  lg: 'w-4 h-4 sm:w-5 sm:h-5',
};

export default function PlayingCard({
  card,
  faceDown,
  size = 'md',
  selected,
  floating,
  floatDelay = 0,
  glow,
  draggable = false,
  onDragStart,
  onDragEnd,
  onClick,
  style,
  className = '',
}: Props) {
  if (faceDown || !card) {
    return (
      <div
        style={style}
        className={`${SIZES[size]} rounded-md sm:rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-electric)] border-2 border-white/40 shadow-md flex items-center justify-center ${className}`}
      >
        <span className="text-white/70 font-display font-extrabold text-[10px] sm:text-xs">A</span>
      </div>
    );
  }

  const theme = SUIT_THEME[card.suit];
  const isCompact = size === 'compact';

  // Smooth floating animation when it is the user's turn
  const animateValues: TargetAndTransition = selected
    ? { y: isCompact ? -14 : -22, scale: 1.05 }
    : floating
    ? {
        y: isCompact ? [-2, -6, -2] : [-4, -12, -4],
        transition: {
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut' as const,
          delay: floatDelay,
        },
      }
    : { y: 0, scale: 1 };

  // Corner layout is only for overlapping desktop cards (lg); compact mobile cards are centered so rank & suit are fully visible and readable
  const isCornerMode = size === 'lg';

  return (
    <motion.div
      drag={draggable ? 'y' : false}
      dragSnapToOrigin={true}
      dragElastic={0.25}
      dragConstraints={{ top: -600, bottom: 0 }}
      whileDrag={{
        scale: 1.18,
        zIndex: 100,
        cursor: 'grabbing',
        boxShadow: '0 20px 30px rgba(0,0,0,0.6), 0 0 15px rgba(56,189,248,0.5)',
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      animate={animateValues}
      whileHover={isCompact ? undefined : draggable ? { y: -16, scale: 1.05 } : onClick ? { y: -16, scale: 1.05 } : undefined}
      whileTap={{ scale: 0.96 }}
      transition={selected ? { type: 'spring', stiffness: 400, damping: 25 } : undefined}
      style={{
        ...style,
        touchAction: draggable ? 'pan-x' : onClick ? 'manipulation' : 'auto',
      }}
      className={`${SIZES[size]} rounded-md sm:rounded-lg bg-white border-[1.5px] sm:border-2 ${theme.borderClass} shadow-md flex flex-col ${
        isCornerMode
          ? 'items-start justify-start p-1 sm:p-1.5'
          : 'items-center justify-center p-0.5 sm:p-1'
      } font-display font-black select-none shrink-0 relative
        ${draggable ? 'cursor-grab active:cursor-grabbing' : onClick ? 'cursor-pointer' : 'cursor-default'}
        ${floating ? 'shadow-lg shadow-sky-950/40 ring-2 ring-sky-400/80' : ''}
        ${selected ? 'ring-2 ring-sky-400 shadow-xl' : ''}
        ${glow ? 'ring-2 ring-emerald-400' : ''}
        ${isCompact ? '' : 'hover:z-40'} transition-shadow
        ${theme.textClass} ${className}`}
    >
      <div className={`flex flex-col ${isCornerMode ? 'items-center pl-0.5' : 'items-center'}`}>
        <span
          className={`leading-none font-black tracking-tight ${
            size === 'compact'
              ? 'text-[10px] min-[390px]:text-[11px] sm:text-xs'
              : size === 'sm'
              ? 'text-[9px]'
              : size === 'md'
              ? 'text-[10px] sm:text-xs'
              : 'text-xs sm:text-sm'
          }`}
        >
          {card.rank}
        </span>
        <SuitIcon suit={card.suit} className={`${ICON_SIZES[size]} mt-0.5`} />
      </div>
    </motion.div>
  );
}
