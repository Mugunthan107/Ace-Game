import { Card, GameEvent, GameState, PlayerRow, Suit, TrickCard, emptyGameState, rankValue } from '../types';
import { createDeck, dealCards, shuffleDeck, sortHand } from './deck';
import { addCards, removeCards } from './player';

/** Finds whichever player currently holds the Ace of Spades. */
export function findAceSpadesPlayer(players: PlayerRow[]): PlayerRow | null {
  return players.find((p) => p.cards.some((c) => c.suit === 'spades' && c.rank === 'A')) ?? null;
}

/**
 * Returns true if `card` is a legal play for a hand, given the current lead suit.
 * - No lead suit yet (this player is leading the trick) -> anything is legal.
 * - Player holds the lead suit -> only lead-suit cards are legal.
 * - Player has none of the lead suit -> any card is legal (a "hit").
 */
export function canPlayCard(hand: Card[], card: Card, leadSuit: Suit | null): boolean {
  if (!leadSuit) return true;
  const hasLeadSuit = hand.some((c) => c.suit === leadSuit);
  if (!hasLeadSuit) return true;
  return card.suit === leadSuit;
}

/** Returns the set of card ids in `hand` that are currently legal to play. */
export function legalCardIds(hand: Card[], leadSuit: Suit | null): Set<string> {
  const ids = new Set<string>();
  for (const c of hand) {
    if (canPlayCard(hand, c, leadSuit)) ids.add(c.id);
  }
  return ids;
}

/** Finds the highest-ranked card of the lead suit among the cards played this trick. */
export function findHighestLeadSuit(centerPile: TrickCard[], leadSuit: Suit): TrickCard {
  const leadCards = centerPile.filter((tc) => tc.card.suit === leadSuit);
  return leadCards.reduce((best, cur) =>
    rankValue(cur.card.rank) > rankValue(best.card.rank) ? cur : best
  );
}

/** True if any card in the trick broke the lead suit (i.e. a hit occurred). */
export function trickHasHit(centerPile: TrickCard[], leadSuit: Suit): boolean {
  return centerPile.some((tc) => tc.card.suit !== leadSuit);
}

export interface TrickResolution {
  wasHit: boolean;
  /** Player who collects the pile (into hand on hit, or to discard pile on clean round) and leads next. */
  collectorId: string;
  collectorName: string;
  /** The player who broke suit, only set when wasHit is true. */
  hitterId: string | null;
  hitterName: string | null;
}

/** A trick where every player followed the lead suit. Highest lead-suit card wins and leads next. */
export function resolveCleanRound(centerPile: TrickCard[], leadSuit: Suit): TrickResolution {
  const winner = findHighestLeadSuit(centerPile, leadSuit);
  return {
    wasHit: false,
    collectorId: winner.playerId,
    collectorName: winner.playerName,
    hitterId: null,
    hitterName: null,
  };
}

/**
 * A trick broken by an off-suit play. The highest lead-suit card collects the pile
 * and leads the next trick.
 */
export function resolveHitRound(centerPile: TrickCard[], leadSuit: Suit): TrickResolution {
  const collector = findHighestLeadSuit(centerPile, leadSuit);
  // The hitter is the most recent off-suit player (the one whose play ended the trick).
  const hitter = [...centerPile].reverse().find((tc) => tc.card.suit !== leadSuit)!;
  return {
    wasHit: true,
    collectorId: collector.playerId,
    collectorName: collector.playerName,
    hitterId: hitter.playerId,
    hitterName: hitter.playerName,
  };
}

/** Dispatches to resolveCleanRound / resolveHitRound based on whether the trick was broken. */
export function resolveTrick(centerPile: TrickCard[], leadSuit: Suit): TrickResolution {
  return trickHasHit(centerPile, leadSuit)
    ? resolveHitRound(centerPile, leadSuit)
    : resolveCleanRound(centerPile, leadSuit);
}

/** A player is "active" (still in play) only while they hold cards and haven't escaped. */
export function isActivePlayer(p: PlayerRow): boolean {
  return !p.escaped && p.cards.length > 0;
}

/**
 * Finds the next active (not escaped, still holding cards) player, walking clockwise
 * (by seat_order) starting just after `fromSeatOrder`, wrapping around the table.
 */
export function findNextActivePlayer(players: PlayerRow[], fromSeatOrder: number): PlayerRow | null {
  const active = players.filter(isActivePlayer);
  if (active.length === 0) return null;
  const sorted = [...players].sort((a, b) => a.seat_order - b.seat_order);
  const n = sorted.length;
  const startIdx = sorted.findIndex((p) => p.seat_order === fromSeatOrder);
  for (let step = 1; step <= n; step++) {
    const candidate = sorted[(startIdx + step) % n];
    if (isActivePlayer(candidate)) return candidate;
  }
  return null;
}

/** Deals a fresh shuffled deck to every seated player and sets up round 1. */
export function startGameDeal(players: PlayerRow[]): { players: PlayerRow[]; gameState: GameState } {
  const deck = shuffleDeck(createDeck());
  const hands = dealCards(deck, players.length);
  const sorted = [...players].sort((a, b) => a.seat_order - b.seat_order);
  const updated = sorted.map((p, i) => ({
    ...p,
    cards: hands[i],
    escaped: false,
    escape_rank: null,
  }));
  const firstLeader = findAceSpadesPlayer(updated)!;
  const gameState: GameState = {
    ...emptyGameState(),
    gameStarted: true,
    roundNumber: 1,
    currentLeader: firstLeader.id,
    currentTurn: firstLeader.id,
  };
  return { players: updated, gameState };
}

export interface ApplyPlayResult {
  players: PlayerRow[];
  gameState: GameState;
  gameEnded: boolean;
}

/**
 * Result of Step 1 of a play.
 */
export interface ApplyCardPlayResult {
  players: PlayerRow[];
  gameState: GameState;
  isPendingResolution: boolean;
  resolution: TrickResolution | null;
}

/**
 * Step 1 of a play: Discards the card onto the table/centerPile.
 * If this play ends the trick (or hits), the card lands on the table and remains
 * visible in `centerPile`, while `isPendingResolution` is set to true.
 */
export function applyCardPlay(
  players: PlayerRow[],
  gameState: GameState,
  actorId: string,
  card: Card
): ApplyCardPlayResult {
  const actor = players.find((p) => p.id === actorId);
  if (!actor) throw new Error('Player not found');

  const newHand = removeCards(actor.cards, [card.id]);
  const updated = players.map((p) => (p.id === actorId ? { ...p, cards: newHand } : p));

  const wasLeadingPlay = gameState.leadSuit === null;
  const leadSuit: Suit = wasLeadingPlay ? card.suit : (gameState.leadSuit as Suit);
  const trickCard: TrickCard = { playerId: actor.id, playerName: actor.name, card };
  const centerPile = [...gameState.centerPile, trickCard];
  const isHitPlay = !wasLeadingPlay && card.suit !== gameState.leadSuit;

  const activeCount = players.filter(isActivePlayer).length;

  if (isHitPlay || centerPile.length >= activeCount) {
    const resolution = resolveTrick(centerPile, leadSuit);
    const centerCards = centerPile.map((tc) => tc.card);

    const event: GameEvent = resolution.wasHit
      ? {
          type: 'hit',
          playerId: resolution.hitterId!,
          playerName: resolution.hitterName!,
          collectorId: resolution.collectorId,
          collectorName: resolution.collectorName,
          cardCount: centerCards.length,
        }
      : {
          type: 'trick_won',
          playerId: resolution.collectorId,
          playerName: resolution.collectorName,
        };

    const newGameState: GameState = {
      ...gameState,
      centerPile, // Cards stay on table so everyone sees the hit!
      leadSuit,
      currentTurn: null, // Pause turns during observation
      hitOccurred: resolution.wasHit,
      trickWinnerId: resolution.collectorId,
      lastEvent: event,
      lastEventAt: Date.now(),
    };

    return {
      players: updated,
      gameState: newGameState,
      isPendingResolution: true,
      resolution,
    };
  }

  // Trick continues normally — advance to the next active player.
  const next = findNextActivePlayer(updated, actor.seat_order);
  const newGameState: GameState = {
    ...gameState,
    centerPile,
    leadSuit,
    currentTurn: next ? next.id : null,
    hitOccurred: false,
    trickWinnerId: null,
    lastEvent: null,
  };

  return {
    players: updated,
    gameState: newGameState,
    isPendingResolution: false,
    resolution: null,
  };
}

/**
 * Step 2 of a trick: Collects the table cards into the collector's hand (on hit)
 * or to the discard pile (on clean round), handles escapes, and assigns the next lead.
 */
export function finalizeTrickResolution(
  players: PlayerRow[],
  gameState: GameState,
  resolution: TrickResolution
): ApplyPlayResult {
  let updated = [...players];
  const centerCards = gameState.centerPile.map((tc) => tc.card);
  let discardPile = gameState.discardPile;

  if (resolution.wasHit) {
    // In a hit round, all cards in this round go to the player who played
    // the largest number (highest rank) of the lead suit.
    updated = updated.map((p) =>
      p.id === resolution.collectorId
        ? { ...p, cards: sortHand(addCards(p.cards, centerCards)) }
        : p
    );
  } else {
    // Clean round: all cards in the trick go to the discard pile.
    discardPile = [...gameState.discardPile, ...centerCards];
  }

  // Only record new events that happen during finalization (escapes / game over).
  // The hit event was already emitted once in step 1 when the card was played.
  const events: GameEvent[] = [];
  let rankings = [...gameState.rankings];
  let leaderCandidateId: string = resolution.collectorId;

  // Walk the leadership chain, escaping any zero-card candidate as we go.
  let guard = 0;
  while (guard++ < 30) {
    const candidate = updated.find((p) => p.id === leaderCandidateId);
    if (!candidate) break;
    if (candidate.cards.length > 0) break;
    updated = updated.map((p) =>
      p.id === candidate.id ? { ...p, escaped: true, escape_rank: rankings.length + 1 } : p
    );
    rankings.push(candidate.id);
    events.push({ type: 'escaped', playerId: candidate.id, playerName: candidate.name, place: rankings.length });
    const next = findNextActivePlayer(updated, candidate.seat_order);
    if (!next) break;
    leaderCandidateId = next.id;
  }

  // Sweep any straggler left at zero cards
  for (const p of updated) {
    if (!p.escaped && p.cards.length === 0) {
      updated = updated.map((x) =>
        x.id === p.id ? { ...x, escaped: true, escape_rank: rankings.length + 1 } : x
      );
      rankings.push(p.id);
      events.push({ type: 'escaped', playerId: p.id, playerName: p.name, place: rankings.length });
    }
  }

  const stillActive = updated.filter(isActivePlayer);
  let gameEnded = false;
  let donkeyPlayerId: string | null = null;
  let finalRankings = rankings;

  if (stillActive.length <= 1) {
    gameEnded = true;
    if (stillActive.length === 1) {
      donkeyPlayerId = stillActive[0].id;
      finalRankings = [...rankings, donkeyPlayerId];
    }
    const donkey = updated.find((p) => p.id === donkeyPlayerId);
    events.push({ type: 'game_over', donkeyId: donkeyPlayerId ?? '', donkeyName: donkey?.name ?? '' });
  }

  const newGameState: GameState = {
    ...gameState,
    discardPile,
    centerPile: [],
    lastRoundPile: gameState.centerPile,
    currentLeader: gameEnded ? null : leaderCandidateId,
    currentTurn: gameEnded ? null : leaderCandidateId,
    leadSuit: null,
    roundNumber: gameState.roundNumber + 1,
    hitOccurred: false,
    trickWinnerId: null,
    rankings: finalRankings,
    donkeyPlayerId,
    gameEnded,
    lastEvent: events.length > 0 ? events[events.length - 1] : null,
    lastEventAt: events.length > 0 ? Date.now() : gameState.lastEventAt,
  };

  return { players: updated, gameState: newGameState, gameEnded };
}

/** Legacy wrapper combining applyCardPlay and finalizeTrickResolution immediately. */
export function applyPlay(
  players: PlayerRow[],
  gameState: GameState,
  actorId: string,
  card: Card
): ApplyPlayResult {
  const step1 = applyCardPlay(players, gameState, actorId, card);
  if (step1.isPendingResolution && step1.resolution) {
    return finalizeTrickResolution(step1.players, step1.gameState, step1.resolution);
  }
  return { players: step1.players, gameState: step1.gameState, gameEnded: false };
}

/**
 * Executes a full card transfer: target player gives ALL their cards to requester.
 * The target player has 0 cards and immediately finishes/escapes as a winner!
 * The requester receives all of the target's cards in their hand.
 */
export function applyCardTransfer(
  players: PlayerRow[],
  gameState: GameState,
  targetId: string,
  requesterId: string
): { players: PlayerRow[]; gameState: GameState; gameEnded: boolean } {
  const target = players.find((p) => p.id === targetId);
  const requester = players.find((p) => p.id === requesterId);

  if (!target || !requester || target.escaped || target.cards.length === 0) {
    return { players, gameState, gameEnded: gameState.gameEnded };
  }

  const transferredCards = [...target.cards];
  const rankings = [...gameState.rankings, target.id];

  let updated = players.map((p) => {
    if (p.id === target.id) {
      return {
        ...p,
        cards: [],
        escaped: true,
        escape_rank: rankings.length,
      };
    }
    if (p.id === requester.id) {
      return {
        ...p,
        cards: sortHand([...p.cards, ...transferredCards]),
      };
    }
    return p;
  });

  const events: GameEvent[] = [
    {
      type: 'card_transfer',
      fromId: target.id,
      fromName: target.name,
      toId: requester.id,
      toName: requester.name,
      cardCount: transferredCards.length,
    },
  ];

  // If the target who escaped was currently leading or holding the turn, advance to next active player
  let currentTurn = gameState.currentTurn;
  let currentLeader = gameState.currentLeader;

  if (currentTurn === target.id) {
    const nextTurn = findNextActivePlayer(updated, target.seat_order);
    currentTurn = nextTurn ? nextTurn.id : null;
  }
  if (currentLeader === target.id) {
    const nextLeader = findNextActivePlayer(updated, target.seat_order);
    currentLeader = nextLeader ? nextLeader.id : null;
  }

  const stillActive = updated.filter(isActivePlayer);
  let gameEnded = false;
  let donkeyPlayerId: string | null = null;
  let finalRankings = rankings;

  if (stillActive.length <= 1) {
    gameEnded = true;
    if (stillActive.length === 1) {
      donkeyPlayerId = stillActive[0].id;
      finalRankings = [...rankings, donkeyPlayerId];
    }
    const donkey = updated.find((p) => p.id === donkeyPlayerId);
    events.push({ type: 'game_over', donkeyId: donkeyPlayerId ?? '', donkeyName: donkey?.name ?? '' });
    currentTurn = null;
    currentLeader = null;
  }

  const newGameState: GameState = {
    ...gameState,
    currentTurn,
    currentLeader,
    rankings: finalRankings,
    donkeyPlayerId,
    gameEnded,
    cardRequest: null,
    lastEvent: events[events.length - 1] ?? null,
    lastEventAt: Date.now(),
  };

  return { players: updated, gameState: newGameState, gameEnded };
}
