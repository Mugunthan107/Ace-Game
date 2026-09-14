import { Card, RANKS, SUITS, Suit, rankValue } from '../types';

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deals a shuffled deck clockwise across N players, as evenly as possible.
 * With 52 cards and N players, some players get one more card than others.
 * Returns an array of hands, index = seat order.
 */
export function dealCards(deck: Card[], playerCount: number): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, i) => {
    hands[i % playerCount].push(card);
  });
  return hands.map(sortHand);
}

/**
 * Sorts a hand: Spades, Hearts, Clubs, Diamonds; within suit A -> 2 (highest to lowest).
 */
export function sortHand(hand: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return rankValue(b.rank) - rankValue(a.rank);
  });
}

export function cardLabel(card: Card): string {
  return `${card.rank}${card.suit === 'spades' ? '♠' : card.suit === 'hearts' ? '♥' : card.suit === 'clubs' ? '♣' : '♦'}`;
}

export { RANKS };
