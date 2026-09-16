import { Card, PlayerRow, Suit, TrickCard, rankValue } from '../types';
import { canPlayCard, findHighestLeadSuit } from './gameRules';

export const BOT_NAMES = [
  'Bot Alex', 'Bot Charlie', 'Bot Sam', 'Bot Jordan', 'Bot Taylor',
  'Bot Morgan', 'Bot Riley', 'Bot Casey', 'Bot Dakota', 'Bot Reese',
  'Bot Quinn', 'Bot Avery', 'Bot Skyler', 'Bot Cameron', 'Bot Jamie',
  'Bot Logan', 'Bot Harper', 'Bot Rowan', 'Bot Finley', 'Bot Jesse',
  'Bot Leo', 'Bot Max', 'Bot Chloe', 'Bot Emma', 'Bot Oliver',
  'Bot Lucas', 'Bot Mason', 'Bot Ethan', 'Bot Liam', 'Bot Noah'
];

export function isBot(
  player?: { name: string; is_bot?: boolean; id?: string } | null,
  myId?: string | null
): boolean {
  if (!player) return false;
  if (myId && player.id === myId) return false;
  if (player.is_bot === true) return true;
  return (
    player.name.startsWith('Bot ') ||
    player.name.startsWith('🤖') ||
    player.name.toLowerCase().includes('bot')
  );
}

/**
 * Advanced Human-Level Memory Strategy for Donkey / Ass Game:
 *
 * 1. Opening:
 *    - In Round 1, if holding Ace of Spades, must lead with it.
 *
 * 2. Leading a trick:
 *    - Memory of dangerous vs safe suits.
 *    - Prioritizes leading from suits where the bot has safe low cards (2–6).
 *    - Avoids leading high lone liabilities (unprotected Kings/Queens).
 *    - Favors breaking suits with low counts to create future hit opportunities.
 *
 * 3. Following suit:
 *    - Last to act in trick: Knows with 100% certainty no one can hit behind them!
 *      Safely sheds highest lead-suit card without risk.
 *    - Not last to act: Ducks under current highest card to avoid holding the biggest card
 *      if a player behind decides to hit.
 *
 * 4. Hitting (unable to follow suit):
 *    - Dumps highest dangerous off-suit cards (Ace, King, Queen) to purge liabilities.
 *    - Prioritizes dumping from short suits (singleton/doubleton) to unlock new void suits.
 */
export function chooseBotCard(
  hand: Card[],
  leadSuit: Suit | null,
  roundNumber: number = 1,
  centerPile: TrickCard[] = [],
  players: PlayerRow[] = [],
  _discardPile: Card[] = []
): Card {
  if (hand.length === 0) {
    throw new Error('Bot has no cards to play');
  }

  // 1. Mandatory Ace of Spades on Round 1 lead
  if (!leadSuit && roundNumber === 1) {
    const aceSpades = hand.find((c) => c.suit === 'spades' && c.rank === 'A');
    if (aceSpades) return aceSpades;
  }

  // Filter legal cards
  const legal = hand.filter((c) => canPlayCard(hand, c, leadSuit));
  const playable = legal.length > 0 ? legal : hand;

  // Case A: Leading a trick (leadSuit === null)
  if (!leadSuit) {
    // Group hand by suit to assess suit strength and counts
    const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, clubs: 0, diamonds: 0 };
    for (const c of hand) {
      suitCounts[c.suit]++;
    }

    // Score cards for leading: lower score = safer to lead
    // Prefer low ranks (2, 3, 4...) and suits with multiple cards so we don't trap ourselves
    const scored = playable.map((c) => {
      const rank = rankValue(c.rank);
      const count = suitCounts[c.suit];
      // High ranks (J=11, Q=12, K=13, A=14) have high penalty when leading
      let dangerScore = rank * 2;
      if (count === 1 && rank > 10) dangerScore += 20; // Dangerous lone high card
      if (rank <= 6) dangerScore -= 10; // Safe low card
      return { card: c, score: dangerScore };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored[0].card;
  }

  // Case B: Following suit
  const isFollowing = playable.some((c) => c.suit === leadSuit);
  if (isFollowing) {
    const leadCards = playable.filter((c) => c.suit === leadSuit);
    const unescapedCount = players.length > 0 ? players.filter((p) => !p.escaped).length : 2;
    const isLastInTrick = centerPile.length + 1 >= unescapedCount;

    // If last to play in the trick, no one can hit behind us!
    // We can safely shed our highest lead card without fear of taking a hit!
    if (isLastInTrick) {
      return leadCards.reduce((highest, c) => (rankValue(c.rank) > rankValue(highest.rank) ? c : highest));
    }

    // Not last to act: someone behind us could hit!
    // Check current highest lead-suit card on the table
    const highestLeadOnTable = centerPile.some((tc) => tc.card.suit === leadSuit)
      ? findHighestLeadSuit(centerPile, leadSuit)
      : null;

    if (highestLeadOnTable) {
      const tableRank = rankValue(highestLeadOnTable.card.rank);
      // Try to duck under the table's highest card
      const lowerCards = leadCards.filter((c) => rankValue(c.rank) < tableRank);
      if (lowerCards.length > 0) {
        // Play highest card that is still lower than table's highest (smart ducking)
        return lowerCards.reduce((best, c) => (rankValue(c.rank) > rankValue(best.rank) ? c : best));
      }
    }

    // Must play higher or no table card yet -> play lowest card to minimize danger
    return leadCards.reduce((lowest, c) => (rankValue(c.rank) < rankValue(lowest.rank) ? c : lowest));
  }

  // Case C: Cannot follow suit -> A HIT!
  // Dump highest dangerous off-suit card (Ace, King, Queen)
  // If tied or close, dump from short suits to create more void suits!
  const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, clubs: 0, diamonds: 0 };
  for (const c of hand) {
    suitCounts[c.suit]++;
  }

  const scoredHitCards = playable.map((c) => {
    const rank = rankValue(c.rank);
    const count = suitCounts[c.suit];
    // Higher rank is priority to dump (A=14 -> 140 points)
    // Fewer cards in that suit gives bonus points (count=1 -> +15 points to eliminate suit)
    const priority = rank * 10 - count * 3;
    return { card: c, priority };
  });

  scoredHitCards.sort((a, b) => b.priority - a.priority);
  return scoredHitCards[0].card;
}
