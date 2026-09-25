export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds';

export const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
};

export const SUIT_COLOR: Record<Suit, 'black' | 'green' | 'red' | 'blue'> = {
  spades: 'black',
  clubs: 'green',
  hearts: 'red',
  diamonds: 'blue',
};

export interface SuitTheme {
  name: string;
  symbol: string;
  colorName: string;
  textClass: string;
  borderClass: string;
  bgBadgeClass: string;
  glowClass: string;
  hex: string;
}

export const SUIT_THEME: Record<Suit, SuitTheme> = {
  spades: {
    name: 'Spades',
    symbol: '♠',
    colorName: 'Black',
    textClass: 'text-slate-900',
    borderClass: 'border-slate-800',
    bgBadgeClass: 'bg-slate-900 text-slate-100 border-slate-700',
    glowClass: 'ring-slate-500/50',
    hex: '#0f172a',
  },
  clubs: {
    name: 'Clover',
    symbol: '♣',
    colorName: 'Green',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-600',
    bgBadgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-500/50',
    glowClass: 'ring-emerald-500/50',
    hex: '#16a34a',
  },
  hearts: {
    name: 'Hearts',
    symbol: '♥',
    colorName: 'Red',
    textClass: 'text-rose-600',
    borderClass: 'border-rose-500',
    bgBadgeClass: 'bg-rose-950 text-rose-300 border-rose-500/50',
    glowClass: 'ring-rose-500/50',
    hex: '#e11d48',
  },
  diamonds: {
    name: 'Diamonds',
    symbol: '♦',
    colorName: 'Blue',
    textClass: 'text-blue-600',
    borderClass: 'border-blue-500',
    bgBadgeClass: 'bg-blue-950 text-blue-300 border-blue-500/50',
    glowClass: 'ring-blue-500/50',
    hex: '#2563eb',
  },
};

// Rank order, highest first: A K Q J 10 9 8 7 6 5 4 3 2
export const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  id: string; // e.g. "spades-A"
  suit: Suit;
  rank: Rank;
}

export function rankValue(rank: Rank): number {
  // Higher number = stronger card. A is strongest (12), 2 is weakest (0).
  return RANKS.length - 1 - RANKS.indexOf(rank);
}

export interface PlayerRow {
  id: string;
  room_id: string;
  name: string;
  is_host: boolean;
  is_bot?: boolean;
  cards: Card[];
  escaped: boolean;
  escape_rank: number | null;
  ready: boolean;
  avatar_color: string;
  joined_at: string;
  seat_order: number;
  connected: boolean;
}

export interface TrickCard {
  playerId: string;
  playerName: string;
  card: Card;
}

export interface CardRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  cardCount: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}







export interface GameState {
  players?: PlayerRow[];
  discardPile: Card[];
  centerPile: TrickCard[];
  lastRoundPile?: TrickCard[];
  currentTurn: string | null; // player id
  currentLeader: string | null; // player id who leads this trick
  leadSuit: Suit | null;
  roundNumber: number;
  matchNumber?: number;
  gameStarted: boolean;
  gameEnded: boolean;
  donkeyPlayerId: string | null;
  rankings: string[]; // player ids in the order they escaped (finish order), donkey last
  hitOccurred: boolean;
  trickWinnerId: string | null;
  cardRequest?: CardRequest | null;
  lastEvent: GameEvent | null;
  lastEventAt: number;
}

export type GameEvent =
  | { type: 'trick_won'; playerId: string; playerName: string }
  | { type: 'hit'; playerId: string; playerName: string; collectorId?: string; collectorName?: string; cardCount?: number }
  | { type: 'escaped'; playerId: string; playerName: string; place: number }
  | { type: 'card_transfer'; fromId: string; fromName: string; toId: string; toName: string; cardCount: number }
  | { type: 'game_over'; donkeyId: string; donkeyName: string };

export interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'ended';
  max_players: number;
  min_players: number;
  game_state: GameState;
  created_at: string;
}

export const AVATAR_COLORS = [
  '#09fcdfff', '#ff0482ff', '#0845caff', '#04fa5eff', 
  '#F59E0B', '#26b8f7ff', '#7909e2ff', '#F97316',
  '#fa0808ff', '#9bfd07ff',
];

export function emptyGameState(matchNumber = 1): GameState {
  return {
    players: [],
    discardPile: [],
    centerPile: [],
    lastRoundPile: [],
    currentTurn: null,
    currentLeader: null,
    leadSuit: null,
    roundNumber: 0,
    matchNumber,
    gameStarted: false,
    gameEnded: false,
    donkeyPlayerId: null,
    rankings: [],
    hitOccurred: false,
    trickWinnerId: null,
    cardRequest: null,
    lastEvent: null,
    lastEventAt: 0,
  };
}
