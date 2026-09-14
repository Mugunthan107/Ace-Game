import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineHandThumbUp, HiOutlineXMark } from 'react-icons/hi2';
import { GiTrophyCup } from 'react-icons/gi';
import { CardRequest, PlayerRow } from '../../types';

interface Props {
  cardRequest?: CardRequest | null;
  selectedTarget: PlayerRow | null;
  myId: string;
  canBuyCards?: boolean;
  onCloseTargetMenu: () => void;
  onRequestCards: (targetId: string) => void;
  onAcceptRequest: () => void;
  onDeclineRequest: () => void;
}

export default function CardDealModal({
  cardRequest,
  selectedTarget,
  myId,
  canBuyCards = true,
  onCloseTargetMenu,
  onRequestCards,
  onAcceptRequest,
  onDeclineRequest,
}: Props) {
  const isTargetOfRequest = Boolean(
    cardRequest && cardRequest.targetId === myId && cardRequest.status === 'pending'
  );
  const isRequesterWaiting = Boolean(
    cardRequest && cardRequest.requesterId === myId && cardRequest.status === 'pending'
  );

  return (
    <>
      {/* 1. Incoming Request Modal (Target Player must Accept or Decline) */}
      <AnimatePresence>
        {isTargetOfRequest && cardRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              className="glass rounded-3xl p-5 sm:p-6 max-w-sm w-full text-center border-2 border-emerald-400/60 shadow-[0_0_50px_rgba(16,185,129,0.3)]"
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-3xl text-emerald-300">
                <GiTrophyCup />
              </div>

              <h2 className="font-display font-extrabold text-lg sm:text-xl text-white mb-1">
                Give All Your Cards?
              </h2>

              <p className="text-xs sm:text-sm text-white/80 leading-relaxed mb-3">
                <span className="font-bold text-sky-300">{cardRequest.requesterName}</span> wants to take all{' '}
                <span className="font-extrabold text-amber-300">{cardRequest.cardCount}</span> of your cards!
              </p>

              <div className="rounded-xl bg-emerald-950/70 border border-emerald-500/40 p-2.5 mb-4 text-[11px] sm:text-xs text-emerald-200">
                ⭐ If you accept, all your cards are given to {cardRequest.requesterName} and{' '}
                <strong className="text-emerald-300 uppercase">YOU immediately finish the game as a WINNER!</strong>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={onAcceptRequest}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-sm sm:text-base shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
                >
                  <HiOutlineHandThumbUp className="text-lg" />
                  <span>Accept & Win Game 🏆</span>
                </button>

                <button
                  onClick={onDeclineRequest}
                  className="w-full py-2 px-4 rounded-xl glass hover:bg-white/10 text-white/70 font-semibold text-xs active:scale-95 transition-transform cursor-pointer"
                >
                  Decline ✕
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Outbound Target Selection Popover (When clicking an opponent seat) */}
      <AnimatePresence>
        {selectedTarget && !isTargetOfRequest && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
            onClick={onCloseTargetMenu}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-3xl p-5 sm:p-6 max-w-sm w-full text-center border border-sky-400/40 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow border border-white/30"
                    style={{ background: selectedTarget.avatar_color }}
                  >
                    {selectedTarget.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm text-white">{selectedTarget.name}</p>
                    <p className="text-[10px] text-sky-300">
                      Holds {selectedTarget.cards.length} {selectedTarget.cards.length === 1 ? 'card' : 'cards'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onCloseTargetMenu}
                  className="w-7 h-7 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                >
                  <HiOutlineXMark />
                </button>
              </div>

              <div className="rounded-xl bg-slate-900/90 border border-white/10 p-3 text-xs text-white/80 leading-relaxed mb-4 text-left">
                <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Give All Your Cards</span>
                </p>
                <p className="text-[11px] text-white/70">
                  Ask <strong className="text-white">{selectedTarget.name}</strong> to give you all their cards.
                  If they accept, their cards are added to your hand, and they immediately escape as a winner.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {canBuyCards ? (
                  <button
                    onClick={() => {
                      onRequestCards(selectedTarget.id);
                      onCloseTargetMenu();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-display font-extrabold text-sm shadow-lg shadow-sky-500/30 flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                  >
                    <span>⚡ Ask for All Cards ({selectedTarget.cards.length} Cards)</span>
                  </button>
                ) : (
                  <div className="py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold text-center leading-snug">
                    ⚠️ Cards cannot be bought in the middle of a round. You can buy cards before or after a round ends.
                  </div>
                )}

                <button
                  onClick={onCloseTargetMenu}
                  className="w-full py-1.5 text-xs text-white/50 hover:text-white/80"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Floating Waiting Banner for Requester while deal is pending */}
      {isRequesterWaiting && cardRequest && (
        <div className="fixed top-14 inset-x-0 z-40 flex justify-center pointer-events-none px-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-full px-3.5 py-1 border border-amber-400/50 bg-amber-950/90 text-amber-200 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-amber-500/20 pointer-events-auto"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Waiting for {cardRequest.targetName} to accept deal...</span>
            <button
              onClick={onDeclineRequest}
              className="text-white/60 hover:text-white text-xs underline ml-1 cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
