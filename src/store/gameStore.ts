import { create } from 'zustand';
import { Card, PlayerRow, RoomRow, CardRequest, GameState } from '../types';
import { applyCardPlay, finalizeTrickResolution, startGameDeal, applyCardTransfer, declarePlayerAss } from '../engine/gameRules';
import { chooseBotCard, isBot } from '../engine/bot';
import {
  addBotPlayers,
  createRoomRecord,
  deleteRoomRecord,
  fetchPlayers,
  fetchRoom,
  findRoomByCode,
  joinRoomRecord,
  removePlayerRecord,
  roomSync,
  updateGameState,
  updatePlayer,
  updateRoom,
} from '../engine/sync';
import { useVoiceStore } from './voiceStore';

const SESSION_KEY = 'ass_session_v1';

interface Session {
  roomId: string;
  roomCode: string;
  playerId: string;
}

function saveSession(s: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export type View = 'landing' | 'create' | 'join' | 'game';

interface GameStore {
  view: View;
  room: RoomRow | null;
  players: PlayerRow[];
  myId: string | null;
  loading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  toast: string | null;

  setView: (v: View) => void;
  setError: (e: string | null) => void;
  setToast: (t: string | null) => void;

  createRoom: (name: string, maxPlayers: number) => Promise<void>;
  joinRoom: (name: string, code: string) => Promise<void>;
  tryReconnect: () => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  cancelRoom: () => Promise<void>;
  startGame: () => Promise<void>;
  executePlay: (actorId: string, card: Card) => Promise<void>;
  playCard: (card: Card) => Promise<void>;
  playBotTurn: (botPlayer: PlayerRow) => Promise<void>;
  playAgain: () => Promise<void>;
  requestAllCards: (targetPlayerId: string) => Promise<void>;
  acceptCardRequest: () => Promise<void>;
  declineCardRequest: () => Promise<void>;
  declareAss: () => Promise<void>;
  me: () => PlayerRow | null;
}

let botTurnTimeout: ReturnType<typeof setTimeout> | null = null;
let currentScheduledTurnKey: string | null = null;

export function triggerBotTurnIfNeeded(getState: () => GameStore) {
  const state = getState();
  const { room, players, myId, playBotTurn } = state;
  if (!room || room.status !== 'playing' || room.game_state.gameEnded) {
    if (botTurnTimeout) {
      clearTimeout(botTurnTimeout);
      botTurnTimeout = null;
    }
    currentScheduledTurnKey = null;
    return;
  }

  const gs = room.game_state;
  // If no turn set (e.g. during trick observation), pause
  if (!gs.currentTurn) {
    return;
  }

  // Each player can put only ONE card for each round
  if (gs.centerPile.some((tc) => tc.playerId === gs.currentTurn)) {
    return;
  }

  // If a card deal request is pending, pause bot turns until resolved
  if (gs.cardRequest && gs.cardRequest.status === 'pending') {
    if (botTurnTimeout) {
      clearTimeout(botTurnTimeout);
      botTurnTimeout = null;
    }
    currentScheduledTurnKey = null;
    return;
  }

  const me = players.find((p) => p.id === myId);
  const isHost = me?.is_host || room.host_id === myId;
  if (!isHost) return;

  const currentTurnPlayer = players.find((p) => p.id === gs.currentTurn);
  if (!currentTurnPlayer || !isBot(currentTurnPlayer, myId)) {
    if (botTurnTimeout) {
      clearTimeout(botTurnTimeout);
      botTurnTimeout = null;
    }
    currentScheduledTurnKey = null;
    return;
  }

  const turnKey = `${gs.roundNumber}-${currentTurnPlayer.id}-${gs.centerPile.length}-${currentTurnPlayer.cards.length}`;
  if (currentScheduledTurnKey === turnKey) {
    return;
  }

  currentScheduledTurnKey = turnKey;
  if (botTurnTimeout) clearTimeout(botTurnTimeout);

  // 5 seconds delay so all players can clearly view, analyze, and track each discarded card
  botTurnTimeout = setTimeout(async () => {
    try {
      const fresh = getState();
      if (!fresh.room || fresh.room.status !== 'playing' || fresh.room.game_state.gameEnded) return;
      if (fresh.room.game_state.currentTurn !== currentTurnPlayer.id) return;
      if (fresh.room.game_state.centerPile.some((tc) => tc.playerId === currentTurnPlayer.id)) return;

      const freshTurnPlayer = fresh.players.find((p) => p.id === currentTurnPlayer.id);
      if (freshTurnPlayer && freshTurnPlayer.cards.length > 0) {
        await playBotTurn(freshTurnPlayer);
      }
    } catch (err) {
      console.error('Error executing bot turn:', err);
    } finally {
      currentScheduledTurnKey = null;
      botTurnTimeout = null;
    }
  }, 5000);
}

/**
 * Protects against rare race conditions where a card was played locally but an incoming
 * room update broadcast for the same round has not yet reflected it.
 */
function mergeIncomingRoom(currentRoom: RoomRow | null, incomingRoom: RoomRow): RoomRow {
  if (
    currentRoom &&
    currentRoom.game_state.roundNumber === incomingRoom.game_state.roundNumber &&
    currentRoom.game_state.centerPile.length > 0
  ) {
    const missingCards = currentRoom.game_state.centerPile.filter(
      (localTc) => !incomingRoom.game_state.centerPile.some((inTc) => inTc.card.id === localTc.card.id)
    );
    if (missingCards.length > 0) {
      return {
        ...incomingRoom,
        game_state: {
          ...incomingRoom.game_state,
          centerPile: [...incomingRoom.game_state.centerPile, ...missingCards],
          leadSuit: incomingRoom.game_state.leadSuit || currentRoom.game_state.leadSuit,
        },
      };
    }
  }
  return incomingRoom;
}

export const useGameStore = create<GameStore>((set, get) => ({
  view: 'landing',
  room: null,
  players: [],
  myId: null,
  loading: false,
  error: null,
  unsubscribe: null,
  toast: null,

  setView: (v) => set({ view: v, error: null }),
  setError: (e) => set({ error: e }),
  setToast: (t) => set({ toast: t }),

  me: () => {
    const { players, myId } = get();
    return players.find((p) => p.id === myId) ?? null;
  },

  createRoom: async (name, maxPlayers) => {
    set({ loading: true, error: null });
    try {
      const { room, player } = await createRoomRecord(name.trim(), maxPlayers, maxPlayers);
      const players = await fetchPlayers(room.id);
      const unsub = roomSync(
        room.id,
        (r) => {
          const finalRoom = mergeIncomingRoom(get().room, r);
          const incomingPlayers = finalRoom.game_state?.players;
          if (incomingPlayers && incomingPlayers.length > 0) {
            set({ room: finalRoom, players: incomingPlayers });
          } else {
            set({ room: finalRoom });
          }
          triggerBotTurnIfNeeded(get);
        },
        () => {
          useVoiceStore.getState().leaveVoice();
          set({ room: null, players: [], view: 'landing' });
          clearSession();
        },
        (ps) => {
          set({ players: ps });
          triggerBotTurnIfNeeded(get);
        }
      );
      saveSession({ roomId: room.id, roomCode: room.code, playerId: player.id });
      set({ room, players, myId: player.id, view: 'game', loading: false, unsubscribe: unsub });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  joinRoom: async (name, code) => {
    set({ loading: true, error: null });
    try {
      const room = await findRoomByCode(code.trim());
      if (!room) throw new Error("That room code doesn't exist.");
      const player = await joinRoomRecord(room, name.trim());
      const players = await fetchPlayers(room.id);
      const unsub = roomSync(
        room.id,
        (r) => {
          const finalRoom = mergeIncomingRoom(get().room, r);
          const incomingPlayers = finalRoom.game_state?.players;
          if (incomingPlayers && incomingPlayers.length > 0) {
            set({ room: finalRoom, players: incomingPlayers });
          } else {
            set({ room: finalRoom });
          }
          triggerBotTurnIfNeeded(get);
        },
        () => {
          useVoiceStore.getState().leaveVoice();
          set({ room: null, players: [], view: 'landing' });
          clearSession();
        },
        (ps) => {
          set({ players: ps });
          triggerBotTurnIfNeeded(get);
        }
      );
      saveSession({ roomId: room.id, roomCode: room.code, playerId: player.id });
      set({ room, players, myId: player.id, view: 'game', loading: false, unsubscribe: unsub });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  tryReconnect: async () => {
    const session = loadSession();
    if (!session) return false;
    try {
      const room = await fetchRoom(session.roomId);
      if (!room) {
        clearSession();
        return false;
      }
      const players = await fetchPlayers(room.id);
      const me = players.find((p) => p.id === session.playerId);
      if (!me) {
        clearSession();
        return false;
      }
      await updatePlayer(me.id, { connected: true });
      const unsub = roomSync(
        room.id,
        (r) => {
          const finalRoom = mergeIncomingRoom(get().room, r);
          const incomingPlayers = finalRoom.game_state?.players;
          if (incomingPlayers && incomingPlayers.length > 0) {
            set({ room: finalRoom, players: incomingPlayers });
          } else {
            set({ room: finalRoom });
          }
          triggerBotTurnIfNeeded(get);
        },
        () => {
          useVoiceStore.getState().leaveVoice();
          set({ room: null, players: [], view: 'landing' });
          clearSession();
        },
        (ps) => {
          set({ players: ps });
          triggerBotTurnIfNeeded(get);
        }
      );
      set({ room, players, myId: me.id, view: 'game', unsubscribe: unsub });
      return true;
    } catch {
      clearSession();
      return false;
    }
  },

  leaveRoom: async () => {
    const { room, myId, unsubscribe, players } = get();
    useVoiceStore.getState().leaveVoice();
    if (unsubscribe) unsubscribe();
    clearSession();
    set({ room: null, players: [], myId: null, view: 'landing', unsubscribe: null });
    if (room && myId) {
      const me = players.find((p) => p.id === myId);
      try {
        if (me?.is_host) {
          const others = players.filter((p) => p.id !== myId);
          if (others.length > 0) {
            const next = [...others].sort((a, b) => a.seat_order - b.seat_order)[0];
            await updatePlayer(next.id, { is_host: true });
            await updateRoom(room.id, { host_id: next.id });
            await removePlayerRecord(myId);
          } else {
            await deleteRoomRecord(room.id);
          }
        } else {
          await removePlayerRecord(myId);
        }
      } catch {
        // best effort cleanup
      }
    }
  },

  removePlayer: async (playerId) => {
    await removePlayerRecord(playerId);
  },

  cancelRoom: async () => {
    const { room, unsubscribe } = get();
    useVoiceStore.getState().leaveVoice();
    if (!room) return;
    if (unsubscribe) unsubscribe();
    clearSession();
    await deleteRoomRecord(room.id);
    set({ room: null, players: [], myId: null, view: 'landing', unsubscribe: null });
  },

  startGame: async () => {
    const { room, players } = get();
    if (!room) return;

    try {
      set({ loading: true, error: null });
      let allPlayers = [...players];
      const targetCount = room.max_players;
      const currentCount = players.length;

      // Automatically fill remaining slots with bots up to max_players
      if (currentCount < targetCount) {
        const botsNeeded = targetCount - currentCount;
        const newBots = await addBotPlayers(room.id, botsNeeded, allPlayers);
        allPlayers = [...allPlayers, ...newBots];
        set({ players: allPlayers });
      }

      if (allPlayers.length < 4) {
        set({ error: 'Need at least 4 players to start.', loading: false });
        return;
      }

      const { players: dealt, gameState } = startGameDeal(allPlayers);
      await Promise.all(
        dealt.map((p) =>
          updatePlayer(p.id, {
            seat_order: p.seat_order,
            cards: p.cards,
            escaped: false,
            escape_rank: null,
          })
        )
      );
      await updateRoom(room.id, { status: 'playing', game_state: gameState });
      set({
        loading: false,
        players: dealt,
        room: { ...room, status: 'playing', game_state: gameState },
      });
      triggerBotTurnIfNeeded(get);
    } catch (err: any) {
      console.error('Failed to start game:', err);
      set({
        loading: false,
        error: err?.message || 'Failed to start game. Please try again.',
      });
      throw err;
    }
  },

  executePlay: async (actorId: string, card: Card) => {
    const { room, players } = get();
    if (!room || room.status !== 'playing' || room.game_state.gameEnded) return;

    // Safety checks: player must currently hold the turn and must not have already played this round
    if (room.game_state.currentTurn !== actorId) return;
    if (room.game_state.centerPile.some((tc) => tc.playerId === actorId)) return;

    // 1. Play card onto table (step 1)
    const step1 = applyCardPlay(players, room.game_state, actorId, card);

    // Optimistic instant local update (0ms response, no UI freeze)
    set({
      players: step1.players,
      room: { ...room, game_state: step1.gameState },
    });

    // Background sync to database
    const actorPlayer = step1.players.find((p: PlayerRow) => p.id === actorId);
    if (actorPlayer) {
      updatePlayer(actorId, { cards: actorPlayer.cards }).catch(() => {});
    }
    await updateGameState(room.id, step1.gameState);

    // 2. If this trick ended (hit or clean round complete), keep cards on table first!
    if (step1.isPendingResolution && step1.resolution) {
      const resolution = step1.resolution;

      // Keep cards on table for 3500ms so all players clearly see every card discarded in this round
      await new Promise((resolve) => setTimeout(resolve, 3500));

      const { room: currentRoom, players: currentPlayers } = get();
      if (!currentRoom) return;

      // Ensure we use the exact centerPile from step1 that ended the trick
      const trickGameState: GameState = {
        ...currentRoom.game_state,
        centerPile: step1.gameState.centerPile,
        leadSuit: step1.gameState.leadSuit,
      };

      const step2 = finalizeTrickResolution(currentPlayers, trickGameState, resolution);

      // Optimistic collection update: pile transfers to collector
      set({
        players: step2.players,
        room: { ...currentRoom, game_state: step2.gameState },
      });

      // Background sync changes to DB
      const beforeById = new Map(currentPlayers.map((p) => [p.id, p]));
      const changed = step2.players.filter((p: PlayerRow) => {
        const before = beforeById.get(p.id);
        return (
          !before ||
          before.cards !== p.cards ||
          before.escaped !== p.escaped ||
          before.escape_rank !== p.escape_rank
        );
      });

      await Promise.all(
        changed.map((p) =>
          updatePlayer(p.id, { cards: p.cards, escaped: p.escaped, escape_rank: p.escape_rank })
        )
      );
      await updateGameState(currentRoom.id, step2.gameState);

      if (step2.gameEnded) {
        await updateRoom(currentRoom.id, { status: 'ended' });
      } else {
        triggerBotTurnIfNeeded(get);
      }
    } else {
      triggerBotTurnIfNeeded(get);
    }
  },

  playCard: async (card) => {
    const { myId, room } = get();
    if (!myId || !room || room.status !== 'playing' || room.game_state.gameEnded) return;
    if (room.game_state.currentTurn !== myId) return;
    if (room.game_state.centerPile.some((tc) => tc.playerId === myId)) return;
    await get().executePlay(myId, card);
  },

  playBotTurn: async (botPlayer: PlayerRow) => {
    const { room, players } = get();
    if (!room || room.status !== 'playing' || room.game_state.gameEnded) return;
    if (room.game_state.currentTurn !== botPlayer.id) return;
    if (room.game_state.centerPile.some((tc) => tc.playerId === botPlayer.id)) return;

    const freshPlayer = players.find((p) => p.id === botPlayer.id) ?? botPlayer;
    if (!freshPlayer || freshPlayer.cards.length === 0) return;

    try {
      const card = chooseBotCard(
        freshPlayer.cards,
        room.game_state.leadSuit,
        room.game_state.roundNumber,
        room.game_state.centerPile,
        players,
        room.game_state.discardPile
      );
      if (!card) return;
      await get().executePlay(freshPlayer.id, card);
    } catch (err) {
      console.error('Bot turn failed:', err);
    }
  },

  playAgain: async () => {
    const { room, players } = get();
    if (!room) return;
    const reset = players.map((p) => ({ ...p, cards: [], escaped: false, escape_rank: null }));
    await Promise.all(
      reset.map((p) => updatePlayer(p.id, { cards: [], escaped: false, escape_rank: null }))
    );
    await updateRoom(room.id, { status: 'waiting' });
  },

  requestAllCards: async (targetPlayerId: string) => {
    const { room, players, myId, acceptCardRequest } = get();
    if (!room || !myId || room.status !== 'playing' || room.game_state.gameEnded) return;

    // Buying cards is only allowed before a round starts or after a round finishes (center pile empty)
    if (room.game_state.centerPile.length > 0 || room.game_state.leadSuit !== null) {
      set({ toast: 'Cards can only be bought before or after a round finishes.' });
      return;
    }

    const me = players.find((p) => p.id === myId);
    const target = players.find((p) => p.id === targetPlayerId);

    if (!me || !target || target.id === myId || target.escaped || target.cards.length === 0) {
      return;
    }

    const req: CardRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      requesterId: me.id,
      requesterName: me.name,
      targetId: target.id,
      targetName: target.name,
      cardCount: target.cards.length,
      status: 'pending',
      createdAt: Date.now(),
    };

    const newGameState = {
      ...room.game_state,
      cardRequest: req,
    };

    set({
      room: { ...room, game_state: newGameState },
    });

    await updateGameState(room.id, newGameState);

    // If target is a bot, bot automatically accepts after 1.2s delay if round is still not active!
    if (isBot(target, myId)) {
      setTimeout(async () => {
        try {
          const fresh = get();
          if (
            fresh.room &&
            fresh.room.game_state.cardRequest &&
            fresh.room.game_state.cardRequest.id === req.id &&
            fresh.room.game_state.centerPile.length === 0 &&
            fresh.room.game_state.leadSuit === null
          ) {
            await acceptCardRequest();
          }
        } catch (err) {
          console.error('Bot card request acceptance error:', err);
        }
      }, 1200);
    }
  },

  acceptCardRequest: async () => {
    const { room, players } = get();
    if (!room || !room.game_state.cardRequest) return;
    const req = room.game_state.cardRequest;

    // 1. Local check: immediately abort if cards are already on table or a round is in progress
    if (room.game_state.centerPile.length > 0 || room.game_state.leadSuit !== null) {
      const clearedGameState = {
        ...room.game_state,
        cardRequest: null,
      };
      set({
        room: { ...room, game_state: clearedGameState },
        toast: 'Card deal cancelled: A round is already in progress.',
      });
      await updateGameState(room.id, clearedGameState).catch(() => {});
      return;
    }

    // 2. Fresh database check: guarantee no concurrent card play landed right as user clicked accept
    const freshRoom = await fetchRoom(room.id).catch(() => null);
    if (
      !freshRoom ||
      !freshRoom.game_state ||
      freshRoom.game_state.centerPile.length > 0 ||
      freshRoom.game_state.leadSuit !== null ||
      !freshRoom.game_state.cardRequest ||
      freshRoom.game_state.cardRequest.id !== req.id
    ) {
      console.warn('[Game] Card transfer aborted: Table has cards or round in progress');
      if (freshRoom) {
        set({
          room: freshRoom,
          players: freshRoom.game_state?.players?.length ? freshRoom.game_state.players : get().players,
          toast: 'Card deal cancelled: A card was played onto the table.',
        });
      }
      return;
    }

    const freshPlayers = await fetchPlayers(room.id).catch(() => players);
    const result = applyCardTransfer(freshPlayers, freshRoom.game_state, req.targetId, req.requesterId);

    // If applyCardTransfer refused because table wasn't empty, abort cleanly
    if (result.gameState.cardRequest === null && result.players === freshPlayers) {
      set({
        room: { ...freshRoom, game_state: result.gameState },
        toast: 'Card deal cancelled.',
      });
      return;
    }

    set({
      players: result.players,
      room: { ...freshRoom, game_state: result.gameState },
      toast: `${req.targetName} gave all cards to ${req.requesterName} and escaped as a Winner! 🏆`,
    });

    // Background sync
    const targetPlayer = result.players.find((p) => p.id === req.targetId);
    const reqPlayer = result.players.find((p) => p.id === req.requesterId);

    if (targetPlayer) {
      updatePlayer(targetPlayer.id, {
        cards: [],
        escaped: true,
        escape_rank: targetPlayer.escape_rank,
      }).catch(() => {});
    }
    if (reqPlayer) {
      updatePlayer(reqPlayer.id, { cards: reqPlayer.cards }).catch(() => {});
    }

    await updateGameState(room.id, result.gameState);

    if (result.gameEnded) {
      await updateRoom(room.id, { status: 'ended' });
    } else {
      triggerBotTurnIfNeeded(get);
    }
  },

  declineCardRequest: async () => {
    const { room } = get();
    if (!room || !room.game_state.cardRequest) return;
    const req = room.game_state.cardRequest;

    const newGameState = {
      ...room.game_state,
      cardRequest: null,
    };

    set({
      room: { ...room, game_state: newGameState },
      toast: `${req.targetName} declined the card deal.`,
    });

    await updateGameState(room.id, newGameState);
  },

  declareAss: async () => {
    const { myId, room, players } = get();
    if (!myId || !room || room.status !== 'playing' || room.game_state.gameEnded) return;
    const activeRemaining = players.filter((p) => !p.escaped && p.cards.length > 0);
    if (activeRemaining.length !== 2) return;
    if (!activeRemaining.some((p) => p.id === myId)) return;

    try {
      const result = declarePlayerAss(players, room.game_state, myId);

      // Optimistic local update
      set({
        players: result.players,
        room: { ...room, status: 'ended', game_state: result.gameState },
      });

      // Background DB sync
      const changed = result.players.filter((p) => {
        const orig = players.find((o) => o.id === p.id);
        return orig && (orig.escaped !== p.escaped || orig.escape_rank !== p.escape_rank);
      });

      await Promise.all(
        changed.map((p) =>
          updatePlayer(p.id, { escaped: p.escaped, escape_rank: p.escape_rank })
        )
      );
      await updateGameState(room.id, result.gameState);
      await updateRoom(room.id, { status: 'ended' });
    } catch (err) {
      console.error('Failed to declare Ass:', err);
    }
  },
}));
