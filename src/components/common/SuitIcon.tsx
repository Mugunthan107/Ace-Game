import { Suit, SUIT_THEME } from '../../types';

interface Props {
  suit: Suit;
  className?: string;
  size?: number | string;
}

export default function SuitIcon({ suit, className = '', size }: Props) {
  const theme = SUIT_THEME[suit];
  const style = size ? { width: size, height: size } : undefined;

  switch (suit) {
    case 'spades':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={style}
          className={`inline-block shrink-0 ${theme.textClass} ${className}`}
          aria-label="Spade"
        >
          {/* Crisp Spade icon with prominent pointed crown and base */}
          <path d="M12 2.2C10.6 5.4 4.5 10.2 4.5 14.5c0 3.3 2.5 5.5 5.5 5.5 1.1 0 .9 2-.2 3.8h4.4c-1.1-1.8-1.3-3.8-.2-3.8 3 0 5.5-2.2 5.5-5.5 0-4.3-6.1-9.1-7.5-12.3z" />
        </svg>
      );

    case 'clubs':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={style}
          className={`inline-block shrink-0 ${theme.textClass} ${className}`}
          aria-label="Clover"
        >
          {/* Three-leaf clover with distinct rounded lobes and central stem */}
          <path d="M12 2a3.8 3.8 0 0 0-3.8 3.8c0 1.2.6 2.3 1.5 3a4.3 4.3 0 0 0-3.9 4.2A4.3 4.3 0 0 0 10.1 17c.9 0 .8 2-.3 4.2h4.4c-1.1-2.2-1.2-4.2-.3-4.2a4.3 4.3 0 0 0 4.3-4c0-2-1.4-3.7-3.4-4.1.9-.7 1.5-1.8 1.5-3.1A3.8 3.8 0 0 0 12 2z" />
        </svg>
      );

    case 'hearts':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={style}
          className={`inline-block shrink-0 ${theme.textClass} ${className}`}
          aria-label="Heart"
        >
          {/* Classic rounded-lobe heart with sharp dip */}
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );

    case 'diamonds':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={style}
          className={`inline-block shrink-0 ${theme.textClass} ${className}`}
          aria-label="Diamond"
        >
          {/* Sharp faceted diamond rhombus */}
          <path d="M12 2L21 12l-9 10L3 12z" />
        </svg>
      );
  }
}
