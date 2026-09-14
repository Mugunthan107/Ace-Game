import { Card, PlayerRow } from '../types';

/** Removes a card (by id) from a hand, returning the new hand. */
export function removeCards(hand: Card[], cardIds: string[]): Card[] {
  const idSet = new Set(cardIds);
  return hand.filter((c) => !idSet.has(c.id));
}

/** Adds cards to a hand (used only for dealing; tricks go to the discard pile, not hands). */
export function addCards(hand: Card[], cards: Card[]): Card[] {
  return [...hand, ...cards];
}

/** Returns a copy of the player marked as escaped, with their finishing place recorded. */
export function escapePlayer(player: PlayerRow, place: number): PlayerRow {
  return { ...player, escaped: true, escape_rank: place };
}

/** Number of players still holding cards. */
export function activePlayerCount(players: PlayerRow[]): number {
  return players.filter((p) => !p.escaped).length;
}
