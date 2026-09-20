import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useGameStore, triggerBotTurnIfNeeded } from '../../store/gameStore';
import { useVoiceStore } from '../../store/voiceStore';
import { PlayerRow } from '../../types';
import { isBot } from '../../engine/bot';
import PlayerSeat from './PlayerSeat';
import CenterPile from './CenterPile';
import CardHand from './CardHand';
import EndGameModal from './EndGameModal';
import EventBanner from './EventBanner';
import CardDealModal from './CardDealModal';
import VoiceControlBar from '../common/VoiceControlBar';

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

  const initVoice = useVoiceStore((s) => s.initVoice);

  const [selectedTarget, setSelectedTarget] = useState<PlayerRow | null>(null);
  const [showAssConfirm, setShowAssConfirm] = useState(false);

  const seated = useMemo(() => [...players].sort((a, b) => a.seat_order - b.seat_order), [players]);
  const me = players.find((p) => p.id === myId);

  // Initialize and persist voice chat connection
  useEffect(() => {
    if (room?.id && me?.id) {
      initVoice(room.id, me.id, me.name);
    }
  }, [room?.id, me?.id, me?.name, initVoice]);

  // Local user's seat index in official seat order
  const myIdx = useMemo(() => {
    const idx = seated.findIndex((p) => p.id === myId);
    return idx >= 0 ? idx : 0;
  }, [seated, myId]);

  const gs = room?.game_state;
  const isRoundActive = (gs?.centerPile.length ?? 0) > 0;

  // If a card is played while target menu is open, immediately close target menu
  useEffect(() => {
    if (isRoundActive && selectedTarget) {
      setSelectedTarget(null);
    }
  }, [isRoundActive, selectedTarget]);

  // Automated bot turns managed by store orchestrator — fast, robust, no hanging
  useEffect(() => {
    if (room && me) {
      triggerBotTurnIfNeeded(useGameStore.getState);
    }
  }, [gs?.currentTurn, gs?.roundNumber, gs?.centerPile.length, gs?.gameEnded, me?.is_host, room, me]);

  if (!room || !me || !gs) return null;

  const hasPlayedThisRound = gs.centerPile.some((tc) => tc.playerId === myId);
  const isMyTurn = gs.currentTurn === myId && !hasPlayedThisRound && !gs.gameEnded;
  const activeRemaining = players.filter((p) => !p.escaped && p.cards.length > 0);
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
            <span className="text-white/40">•</span>
            <span className="text-sky-300 font-bold text-[11px] sm:text-xs">R{gs.roundNumber}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <VoiceControlBar compact />

          {/* Top right: Donkey button (shown only during final 2-player showdown) */}
          {isFinalTwo && (
            <button
              onClick={() => setShowAssConfirm(true)}
              className="px-2 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-[10px] sm:text-xs shadow-[0_0_12px_rgba(225,29,72,0.6)] border border-rose-400/50 flex items-center gap-1 active:scale-95 transition-all animate-pulse shrink-0"
              title="Declare yourself as Donkey"
            >
              <span>🫏</span>
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

          return (
            <PlayerSeat
              key={p.id}
              player={p}
              isTurn={gs.currentTurn === p.id}
              isMe={isPlayerMe}
              isDonkeyCandidate={donkeyCandidateId === p.id}
              totalPlayers={seated.length}
              style={getAnticlockwiseSeatPosition(relIdx, seated.length)}
              onClick={isEligibleTarget ? handleSeatClick : undefined}
            />
          );
        })}

        {/* Center Discard Arena */}
        <CenterPile
          centerPile={gs.centerPile}
          lastRoundPile={gs.lastRoundPile}
          hitPlayerId={gs.hitOccurred ? gs.centerPile.at(-1)?.playerId ?? null : null}
          collectorId={gs.trickWinnerId}
          leadSuit={gs.leadSuit}
          roundNumber={gs.roundNumber}
          isMyTurn={isMyTurn}
        />
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
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-white/10 text-white/80 text-[10px] sm:text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="truncate max-w-[130px]">
                  {players.find((p) => p.id === gs.currentTurn)?.name ?? 'Player'}
                  {isBot(players.find((p) => p.id === gs.currentTurn), myId) ? ' thinking...' : ' playing...'}
                </span>
              </div>
            )}
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
          players={players}
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
        selectedTarget={selectedTarget}
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
