import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useGameStore, triggerBotTurnIfNeeded, checkAndResolvePendingTrick } from '../../store/gameStore';
import { PlayerRow } from '../../types';
import { isBot } from '../../engine/bot';
import PlayerSeat from './PlayerSeat';
import CenterPile from './CenterPile';
import CardHand from './CardHand';
import EndGameModal from './EndGameModal';
import EventBanner from './EventBanner';
import CardDealModal from './CardDealModal';
import HitCardFlyAnimation from './HitCardFlyAnimation';

/**
 * Positions players along an anticlockwise circular/oval table around the center pile.
 * - relIdx = 0: Local user ("Me") -> Always seated at Bottom Center.
 * - relIdx = 1: Next player in turn order -> Seated immediately to local user's left (anticlockwise).
 * - relIdx = total - 1: Previous player in turn order -> Seated immediately to local user's right.
 * - Intermediate players flow anticlockwise around the table (Bottom -> Left -> Top -> Right).
 * Safe boundary margins prevent clipping on 360px+ mobile screens.
 */
function getAnticlockwiseSeatPosition(relIdx: number, total: number): { left: string; top: string } {
  // Center of round table arena
  const cx = 50;
  const cy = 46;
  const rx = 37.5;
  const ry = 36;

  const theta = (relIdx / total) * 2 * Math.PI;

  const left = cx - rx * Math.sin(theta);
  const top = cy + ry * Math.cos(theta);

  return {
    left: `${left.toFixed(1)}%`,
    top: `${top.toFixed(1)}%`,
  };
}

export default function GameBoard() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore((s) => s.players);
  const myId = useGameStore((s) => s.myId);
  const playCard = useGameStore((s) => s.playCard);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const playAgain = useGameStore((s) => s.playAgain);
  const requestAllCards = useGameStore((s) => s.requestAllCards);
  const acceptCardRequest = useGameStore((s) => s.acceptCardRequest);
  const declineCardRequest = useGameStore((s) => s.declineCardRequest);
  const declareAss = useGameStore((s) => s.declareAss);
  const setToast = useGameStore((s) => s.setToast);

  const [selectedTarget, setSelectedTarget] = useState<PlayerRow | null>(null);
  const [showAssConfirm, setShowAssConfirm] = useState(false);

  const gs = room?.game_state;
  const isRoundActive = (gs?.centerPile.length ?? 0) > 0;

  // Authoritative in-game players with filtered discarded cards
  const effectivePlayers = useMemo(() => {
    const baseList =
      room?.status !== 'waiting' && gs?.players && gs.players.length > 0
        ? gs.players
        : players;

    if (!gs || (!gs.discardPile?.length && !gs.centerPile?.length)) {
      return baseList;
    }

    const playedIds = new Set<string>();
    for (const c of gs.discardPile || []) {
      if (c?.id) playedIds.add(c.id);
    }
    for (const tc of gs.centerPile || []) {
      if (tc?.card?.id) playedIds.add(tc.card.id);
    }

    return baseList.map((p) => {
      const cards = Array.isArray(p.cards) ? p.cards : [];
      const filtered = cards.filter((c) => c?.id && !playedIds.has(c.id));
      if (filtered.length === cards.length) return p;
      return { ...p, cards: filtered };
    });
  }, [room?.status, players, gs]);

  const seated = useMemo(() => [...effectivePlayers].sort((a, b) => a.seat_order - b.seat_order), [effectivePlayers]);
  const me = useMemo(() => effectivePlayers.find((p) => p.id === myId), [effectivePlayers, myId]);

  // Local user's seat index in official seat order
  const myIdx = useMemo(() => {
    const idx = seated.findIndex((p) => p.id === myId);
    return idx >= 0 ? idx : 0;
  }, [seated, myId]);

  // Identify the player who was hit and must collect the cards
  const hitCollector = useMemo(() => {
    if (!gs?.hitOccurred || !gs?.trickWinnerId) return null;
    return effectivePlayers.find((p) => p.id === gs.trickWinnerId) ?? null;
  }, [gs, effectivePlayers]);

  // Compute table position of collector for sequential card flying animation
  const collectorSeatPos = useMemo(() => {
    if (!hitCollector || seated.length === 0) return null;
    const collectorIdx = seated.findIndex((p) => p.id === hitCollector.id);
    if (collectorIdx < 0) return null;
    const relIdx = (collectorIdx - myIdx + seated.length) % seated.length;
    return getAnticlockwiseSeatPosition(relIdx, seated.length);
  }, [hitCollector, seated, myIdx]);

  const HITTER_EMOJIS = useMemo(() => ['😄', '🤫', '😎', '🤪', '🤭', '🤣'] as const, []);
  const COLLECTOR_EMOJIS = useMemo(() => ['😭', '😢', '🥴', '😵', '😵‍💫','🥺'] as const, []);

  const [activeHit, setActiveHit] = useState<{
    hitterId: string;
    collectorId: string;
    hitRound: number;
    hitterEmoji: string;
    collectorEmoji: string;
  } | null>(null);

  const lastProcessedHitKeyRef = useRef<string | null>(null);
  const lastHitterIdxRef = useRef<number>(-1);
  const lastCollectorIdxRef = useRef<number>(-1);

  useEffect(() => {
    // When a player puts another card on the table in the next round (roundNumber > hitRound), clear the emoji!
    if (activeHit && gs && gs.roundNumber > activeHit.hitRound && gs.centerPile.length > 0) {
      setActiveHit(null);
      return;
    }

    let hitter: string | undefined;
    let collector: string | undefined;

    if (gs?.lastEvent?.type === 'hit' && gs.lastEventAt) {
      hitter = gs.lastEvent.playerId;
      collector = gs.lastEvent.collectorId ?? gs.trickWinnerId ?? undefined;
    } else if (gs?.hitOccurred) {
      hitter = gs.centerPile.at(-1)?.playerId;
      collector = gs.trickWinnerId ?? undefined;
    }

    if (hitter && collector && gs) {
      const hitKey = `${gs.matchNumber ?? 1}-${gs.roundNumber}-${hitter}-${collector}-${gs.lastEventAt ?? ''}`;
      if (lastProcessedHitKeyRef.current !== hitKey) {
        lastProcessedHitKeyRef.current = hitKey;

        // Generate random hitter emoji (guaranteed different from previous hit)
        let nextHitterIdx = Math.floor(Math.random() * (HITTER_EMOJIS.length - 1));
        if (lastHitterIdxRef.current !== -1 && nextHitterIdx >= lastHitterIdxRef.current) {
          nextHitterIdx++;
        }
        lastHitterIdxRef.current = nextHitterIdx;
        const hitterEmoji = HITTER_EMOJIS[nextHitterIdx];

        // Generate random collector emoji (guaranteed different from previous hit)
        let nextCollectorIdx = Math.floor(Math.random() * (COLLECTOR_EMOJIS.length - 1));
        if (lastCollectorIdxRef.current !== -1 && nextCollectorIdx >= lastCollectorIdxRef.current) {
          nextCollectorIdx++;
        }
        lastCollectorIdxRef.current = nextCollectorIdx;
        const collectorEmoji = COLLECTOR_EMOJIS[nextCollectorIdx];

        setActiveHit({
          hitterId: hitter,
          collectorId: collector,
          hitRound: gs.roundNumber,
          hitterEmoji,
          collectorEmoji,
        });
      }
    }
  }, [gs, activeHit, HITTER_EMOJIS, COLLECTOR_EMOJIS]);

  // Automated bot turns managed by store orchestrator — fast, robust, no hanging
  useEffect(() => {
    if (me?.is_host) {
      triggerBotTurnIfNeeded(useGameStore.getState);
    }
  }, [gs?.currentTurn, gs?.roundNumber, gs?.centerPile.length, gs?.gameEnded, me?.is_host]);

  // Self-healing watchdog: auto-resolves any pending trick if stuck (e.g. hit or round observation timeout)
  useEffect(() => {
    if (!gs || gs.gameEnded || !gs.gameStarted) return;
    if (gs.currentTurn === null && gs.centerPile.length > 0) {
      checkAndResolvePendingTrick(useGameStore.getState);
      const interval = setInterval(() => {
        const curGs = useGameStore.getState().room?.game_state;
        if (curGs && curGs.currentTurn === null && curGs.centerPile.length > 0) {
          checkAndResolvePendingTrick(useGameStore.getState);
        } else {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gs?.currentTurn, gs?.centerPile.length, gs?.roundNumber, gs?.lastEventAt, me?.is_host]);

  if (!room || !me || !gs) return null;

  const hasPlayedThisRound = gs.centerPile.some((tc) => tc.playerId === myId);
  const isMyTurn = gs.currentTurn === myId && !hasPlayedThisRound && !gs.gameEnded && !me.escaped && me.cards.length > 0;
  const activeRemaining = effectivePlayers.filter((p) => !p.escaped && p.cards.length > 0);
  const donkeyCandidateId = activeRemaining.length === 1 ? activeRemaining[0].id : null;
  const isFinalTwo = activeRemaining.length === 2 && !me.escaped && !gs.gameEnded && activeRemaining.some((p) => p.id === myId);

  return (
    <div className="gradient-purple-blue h-[100dvh] min-h-[100dvh] w-full flex flex-col justify-between relative overflow-hidden select-none">
      {/* Top bar — compact, sleek, safe-area aware */}
      <div className="relative z-20 flex items-center justify-between safe-top safe-x px-2.5 sm:px-3 pt-2 pb-1 text-white text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={leaveRoom}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full glass flex items-center justify-center text-white/80 active:scale-95 transition-transform shrink-0"
            aria-label="Exit room"
          >
            <HiOutlineXMark />
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5 font-semibold">
            <img src="/Ass Logo.png" alt="Ass Logo" className="w-5 h-5 sm:w-6 sm:h-6 object-contain drop-shadow shrink-0" />
            <span className="tracking-wide text-[11px] sm:text-xs">R:{room.code}</span>
            {gs.matchNumber && gs.matchNumber > 1 && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-amber-300 font-bold text-[10px] sm:text-xs bg-amber-950/70 border border-amber-400/40 px-1.5 py-0.2 rounded">
                  Match {gs.matchNumber}
                </span>
              </>
            )}
            <span className="text-white/40">•</span>
            <span className="text-sky-300 font-bold text-[11px] sm:text-xs">R{gs.roundNumber}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Top right: Donkey button (shown only during final 2-player showdown) */}
          {isFinalTwo && (
            <button
              onClick={() => setShowAssConfirm(true)}
              className="px-2 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-[10px] sm:text-xs shadow-[0_0_12px_rgba(225,29,72,0.6)] border border-rose-400/50 flex items-center gap-1 active:scale-95 transition-all animate-pulse shrink-0"
              title="Declare yourself as Donkey"
            >
              <span>🫏🫏</span>
              <span className="tracking-wide uppercase hidden sm:inline">Donkey</span>
            </button>
          )}
        </div>
      </div>

      <EventBanner event={gs.lastEvent} at={gs.lastEventAt} />

      {/* Table Arena: Anticlockwise Circular Seating around Center Discard Tray */}
      <div className="relative flex-1 w-full min-h-[240px] sm:min-h-[350px] overflow-hidden">
        {/* Subtle Oval Table Felt Outline */}
        <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[78%] sm:w-[80%] h-[74%] sm:h-[76%] rounded-[48%] border border-cyan-500/15 bg-radial from-slate-900/20 to-slate-950/60 pointer-events-none -z-0 shadow-[inset_0_0_40px_rgba(14,165,233,0.06)]" />

        {/* All Seated Players: Rotated so 'Me' is Bottom Center (relIdx=0), Next is Left (relIdx=1), Prev is Right */}
        {seated.map((p, i) => {
          const relIdx = (i - myIdx + seated.length) % seated.length;
          const isPlayerMe = p.id === myId;
          const isEligibleTarget = !isPlayerMe && !p.escaped && p.cards.length > 0 && !me.escaped && !gs.gameEnded;

          const handleSeatClick = () => {
            if (!isEligibleTarget) return;
            if (isRoundActive) {
              // In the center of each round, clicking another player does NOT show the buy button
              setToast('Cards can only be bought before or after a round ends.');
              return;
            }
            setSelectedTarget(p);
          };

          // The emoji stays visible until a player puts another card on the table in the next round
          const hasPutAnotherCard =
            activeHit && gs.roundNumber > activeHit.hitRound && gs.centerPile.length > 0;
          const isHitActive = activeHit && !hasPutAnotherCard;

          const hitReaction = isHitActive
            ? p.id === activeHit.hitterId
              ? { role: 'hitter' as const, emoji: activeHit.hitterEmoji }
              : p.id === activeHit.collectorId
              ? { role: 'collector' as const, emoji: activeHit.collectorEmoji }
              : null
            : null;

          return (
            <PlayerSeat
              key={p.id}
              player={p}
              isTurn={gs.currentTurn === p.id && !p.escaped && p.cards.length > 0}
              isMe={isPlayerMe}
              isDonkeyCandidate={donkeyCandidateId === p.id}
              totalPlayers={seated.length}
              style={getAnticlockwiseSeatPosition(relIdx, seated.length)}
              onClick={isEligibleTarget ? handleSeatClick : undefined}
              hitReaction={hitReaction}
            />
          );
        })}

        {/* Center Discard Arena */}
        <CenterPile
          centerPile={gs.centerPile}
          lastRoundPile={gs.lastRoundPile}
          hitPlayerId={gs.hitOccurred ? gs.centerPile.at(-1)?.playerId ?? null : null}
          collectorId={gs.trickWinnerId}
          collectorName={hitCollector?.name ?? null}
          leadSuit={gs.leadSuit}
          roundNumber={gs.roundNumber}
          isMyTurn={isMyTurn}
        />

        {/* Sequential Line-by-Line Card Flight to Hit Player */}
        {gs.hitOccurred && gs.centerPile.length > 0 && collectorSeatPos && hitCollector && (
          <HitCardFlyAnimation
            key={`hit-fly-${gs.roundNumber}-${gs.centerPile.length}-${gs.trickWinnerId}`}
            cards={gs.centerPile}
            targetPos={collectorSeatPos}
            collectorName={hitCollector.name}
            isMe={hitCollector.id === myId}
          />
        )}
      </div>

      {/* Local User Action Bar + Turn Prompt (docked above hand) */}
      <div className="relative z-20 px-3 py-1 flex items-center justify-between border-t border-white/10 bg-slate-950/70 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs font-bold text-white/90">Your Cards</span>
          <span className="text-[10px] sm:text-[11px] text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-400/30 font-semibold">
            {me.cards.length} {me.cards.length === 1 ? 'card' : 'cards'}
          </span>
          {me.escaped && (
            <span className="text-[10px] sm:text-[11px] text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-400/30 font-semibold">
              Escaped Safe
            </span>
          )}
        </div>

        {/* Turn indicator prompt */}
        {!gs.gameEnded && (
          <div>
            {isMyTurn ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: [1, 1.04, 1], opacity: 1 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/30 to-blue-500/30 border border-sky-400/70 text-white font-extrabold text-[11px] sm:text-xs shadow-lg shadow-sky-500/20"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span>YOUR TURN</span>
              </motion.div>
            ) : effectivePlayers.find((p) => p.id === gs.currentTurn && !p.escaped && p.cards.length > 0) ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-white/10 text-white/80 text-[10px] sm:text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="truncate max-w-[130px]">
                  {effectivePlayers.find((p) => p.id === gs.currentTurn)?.name ?? 'Player'}
                  {isBot(effectivePlayers.find((p) => p.id === gs.currentTurn), myId) ? ' thinking...' : ' playing...'}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Hand Container */}
      <div
        className={`relative z-10 glass transition-all duration-300 ${
          isMyTurn ? 'border-t-2 border-sky-400/50 shadow-[0_-8px_30px_rgba(56,189,248,0.2)]' : ''
        }`}
      >
        <CardHand
          hand={me.cards}
          leadSuit={gs.leadSuit}
          roundNumber={gs.roundNumber}
          isMyTurn={isMyTurn}
          onPlay={playCard}
          escaped={me.escaped}
        />
      </div>

      {gs.gameEnded && (
        <EndGameModal
          players={effectivePlayers}
          rankings={gs.rankings}
          donkeyId={gs.donkeyPlayerId}
          isHost={me.is_host}
          onPlayAgain={playAgain}
          onExit={leaveRoom}
        />
      )}

      {/* Card Deal (Buy / Give All Cards) Modal & Action Popover */}
      <CardDealModal
        cardRequest={gs.cardRequest}
        selectedTarget={isRoundActive ? null : selectedTarget}
        myId={me.id}
        canBuyCards={!isRoundActive}
        onCloseTargetMenu={() => setSelectedTarget(null)}
        onRequestCards={(targetId) => requestAllCards(targetId)}
        onAcceptRequest={acceptCardRequest}
        onDeclineRequest={declineCardRequest}
      />

      {/* Donkey Declaration Confirmation Modal */}
      {showAssConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass relative w-full max-w-xs rounded-2xl p-5 text-center border border-red-500/40 shadow-2xl shadow-red-950/60"
          >
            <div className="text-3xl mb-1.5">🫏</div>
            <h3 className="font-display font-extrabold text-lg text-white">Accept Being the Donkey?</h3>
            <p className="text-white/70 text-xs mt-1.5 leading-relaxed">
              If you click <span className="text-red-400 font-bold">Donkey</span>, you surrender the match, the other player escapes, and you become the Donkey!
            </p>

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setShowAssConfirm(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAssConfirm(false);
                  declareAss();
                }}
                className="flex-1 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-600/40 active:scale-95 transition-all"
              >
                Yes, I am Donkey
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
