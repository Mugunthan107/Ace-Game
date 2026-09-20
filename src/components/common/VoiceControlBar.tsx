import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsMicFill, BsMicMuteFill } from 'react-icons/bs';
import { HiSpeakerWave, HiSpeakerXMark, HiMiniUsers } from 'react-icons/hi2';
import { useVoiceStore } from '../../store/voiceStore';
import { useGameStore } from '../../store/gameStore';

interface Props {
  compact?: boolean;
}

export default function VoiceControlBar({ compact = false }: Props) {
  const isMicOn = useVoiceStore((s) => s.isMicOn);
  const isSpeakerOn = useVoiceStore((s) => s.isSpeakerOn);
  const isSpeaking = useVoiceStore((s) => s.isSpeaking);
  const isRequestingMic = useVoiceStore((s) => s.isRequestingMic);
  const isVirtualMic = useVoiceStore((s) => s.isVirtualMic);
  const error = useVoiceStore((s) => s.error);
  const remotePlayers = useVoiceStore((s) => s.remotePlayers);
  const toggleMic = useVoiceStore((s) => s.toggleMic);
  const toggleSpeaker = useVoiceStore((s) => s.toggleSpeaker);
  const enableVirtualMic = useVoiceStore((s) => s.enableVirtualMic);
  const clearError = useVoiceStore((s) => s.clearError);

  const players = useGameStore((s) => s.players);
  const myId = useGameStore((s) => s.myId);
  const [showRoster, setShowRoster] = useState(false);

  // Auto-dismiss error message after 8 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      clearError();
    }, 8000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  const remoteCount = Object.keys(remotePlayers).length;
  const totalInVoice = remoteCount + 1; // local + remote

  // Anyone currently talking?
  const isAnyoneTalking = isSpeaking || Object.values(remotePlayers).some((p) => p.isSpeaking);

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Main Control Pill */}
      <div
        className={`flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/15 bg-slate-950/70 backdrop-blur-md shadow-lg shadow-black/30 transition-all ${
          compact ? 'px-2 py-1' : 'px-3 py-1.5'
        }`}
      >
        {/* Microphone Toggle Button */}
        <button
          onClick={toggleMic}
          disabled={isRequestingMic}
          className={`group relative flex items-center gap-1.5 rounded-full font-bold transition-all active:scale-95 select-none ${
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          } ${
            isMicOn
              ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-slate-950 shadow-[0_0_16px_rgba(34,197,94,0.6)] ring-2 ring-emerald-300'
              : 'bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 shadow-sm'
          }`}
          title={
            isMicOn
              ? isVirtualMic
                ? 'Virtual Test Mic is active (Click to turn off)'
                : 'Microphone is ON (Click to mute)'
              : 'Microphone is OFF (Click to turn on)'
          }
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isRequestingMic ? (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isMicOn ? (
            <div className="relative flex items-center justify-center">
              <BsMicFill className="text-xs sm:text-sm text-slate-950 drop-shadow" />
              {/* Dynamic Sound Wave Pulse */}
              {isSpeaking && (
                <span className="absolute -inset-1 rounded-full border-2 border-slate-950 animate-ping opacity-60 pointer-events-none" />
              )}
            </div>
          ) : (
            <BsMicMuteFill className="text-xs sm:text-sm text-rose-300" />
          )}

          <span className="font-extrabold tracking-wide uppercase text-[10px] sm:text-[11px]">
            {isMicOn ? (
              <span className="flex items-center gap-1">
                <span>{isVirtualMic ? 'Test Mic' : 'Mic On'}</span>
                {/* Visualizer bars when speaking */}
                {isSpeaking && (
                  <span className="flex items-end gap-0.5 h-2.5">
                    <span
                      className="w-0.5 bg-slate-950 rounded-full animate-[pulse_0.4s_infinite_alternate]"
                      style={{ height: '70%' }}
                    />
                    <span
                      className="w-0.5 bg-slate-950 rounded-full animate-[pulse_0.5s_infinite_alternate_0.2s]"
                      style={{ height: '100%' }}
                    />
                    <span
                      className="w-0.5 bg-slate-950 rounded-full animate-[pulse_0.35s_infinite_alternate_0.1s]"
                      style={{ height: '80%' }}
                    />
                  </span>
                )}
              </span>
            ) : (
              'Mic Off'
            )}
          </span>
        </button>

        {/* Speaker / Deafen Toggle Button */}
        <button
          onClick={toggleSpeaker}
          className={`flex items-center gap-1.5 rounded-full font-bold transition-all active:scale-95 select-none ${
            compact ? 'p-1.5 text-xs' : 'px-2.5 py-1.5 text-xs'
          } ${
            isSpeakerOn
              ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40'
              : 'bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 ring-1 ring-rose-400/50'
          }`}
          title={
            isSpeakerOn
              ? 'Speaker is ON (Click to deafen/mute incoming sound)'
              : 'Speaker is MUTED (Click to hear players)'
          }
          aria-label={isSpeakerOn ? 'Deafen sound' : 'Undeafen sound'}
        >
          {isSpeakerOn ? (
            <HiSpeakerWave className="text-sm text-sky-300" />
          ) : (
            <HiSpeakerXMark className="text-sm text-rose-300" />
          )}
          {!compact && (
            <span className="font-extrabold tracking-wide uppercase text-[10px] sm:text-[11px]">
              {isSpeakerOn ? 'Sound' : 'Deafened'}
            </span>
          )}
        </button>

        {/* Voice Room Status & Dropdown Trigger */}
        <button
          onClick={() => setShowRoster((v) => !v)}
          className="flex items-center gap-1 px-1.5 py-1 rounded-full text-white/70 hover:text-white transition-colors text-[10px] sm:text-[11px]"
          title="View voice participants"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAnyoneTalking
                ? 'bg-emerald-400 animate-ping'
                : 'bg-emerald-500/80'
            }`}
          />
          <HiMiniUsers className="text-xs" />
          <span className="font-semibold text-white/90">{totalInVoice}</span>
        </button>
      </div>

      {/* Mic Permission / Access Error Alert Popover */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            className="absolute top-full mt-2 z-50 p-3 rounded-2xl bg-slate-950/95 border border-rose-500/60 text-white text-[11px] shadow-2xl backdrop-blur-xl max-w-xs w-72 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-rose-400 font-bold text-xs flex items-center gap-1">
                ⚠️ Microphone Notice
              </span>
              <button
                onClick={clearError}
                className="text-white/60 hover:text-white text-xs p-0.5 rounded hover:bg-white/10"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>

            <p className="text-white/80 text-[11px] leading-relaxed">{error}</p>

            {/* If no hardware mic is found, offer simulated test mic option so user can test communication */}
            {(error.includes('No microphone found') || error.includes('does not support')) && (
              <div className="flex items-center gap-2 pt-1.5 border-t border-white/10">
                <button
                  onClick={() => {
                    enableVirtualMic();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[10px] border border-sky-400/40 active:scale-95 transition-all flex items-center gap-1"
                >
                  🎙️ Try Virtual Mic
                </button>
                <button
                  onClick={clearError}
                  className="px-2 py-1 text-white/50 hover:text-white text-[10px]"
                >
                  Dismiss
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Participants Popover */}
      <AnimatePresence>
        {showRoster && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            className="absolute top-full mt-2 z-50 w-52 sm:w-60 rounded-2xl bg-slate-950/95 border border-white/20 p-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                Voice Room ({totalInVoice})
              </span>
              <span className="text-[9px] text-white/50">Encrypted P2P</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {/* Local User */}
              <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSpeaking
                        ? 'bg-emerald-400 ring-2 ring-emerald-400/50'
                        : isMicOn
                        ? 'bg-emerald-500/60'
                        : 'bg-rose-500/80'
                    }`}
                  />
                  <span className="font-semibold text-white">
                    You {isVirtualMic ? '(Test)' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isMicOn ? (
                    <BsMicFill className="text-emerald-400 text-xs" />
                  ) : (
                    <BsMicMuteFill className="text-rose-400 text-xs" />
                  )}
                  {isSpeakerOn ? (
                    <HiSpeakerWave className="text-sky-300 text-xs" />
                  ) : (
                    <HiSpeakerXMark className="text-rose-400 text-xs" />
                  )}
                </div>
              </div>

              {/* Remote Participants */}
              {players
                .filter((p) => p.id !== myId && !p.is_bot)
                .map((p) => {
                  const state = remotePlayers[p.id];
                  const pMicOn = state?.isMicOn ?? false;
                  const pSpeakerOn = state?.isSpeakerOn ?? true;
                  const pSpeaking = state?.isSpeaking ?? false;

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/5 text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate max-w-[120px]">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            pSpeaking
                              ? 'bg-emerald-400 ring-2 ring-emerald-400/50 animate-pulse'
                              : pMicOn
                              ? 'bg-emerald-500/60'
                              : 'bg-rose-500/80'
                          }`}
                        />
                        <span className="text-white/90 truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {pMicOn ? (
                          <BsMicFill
                            className={`text-xs ${
                              pSpeaking ? 'text-emerald-300 scale-110' : 'text-emerald-400'
                            }`}
                          />
                        ) : (
                          <BsMicMuteFill className="text-rose-400 text-xs" />
                        )}
                        {pSpeakerOn ? (
                          <HiSpeakerWave className="text-sky-300 text-xs" />
                        ) : (
                          <HiSpeakerXMark className="text-rose-400 text-xs" />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
