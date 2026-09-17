import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoMic, IoMicOff, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
import {
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineUsers,
  HiOutlineLockClosed,
  HiOutlineArrowPath,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { useVoiceStore } from '../../store/voiceStore';
import { useGameStore } from '../../store/gameStore';

export default function VoiceWidget() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore((s) => s.players);
  const myId = useGameStore((s) => s.myId);

  const isMuted = useVoiceStore((s) => s.isMuted);
  const isDeafened = useVoiceStore((s) => s.isDeafened);
  const isSpeaking = useVoiceStore((s) => s.isSpeaking);
  const peers = useVoiceStore((s) => s.peers);
  const error = useVoiceStore((s) => s.error);
  const clearError = useVoiceStore((s) => s.clearError);
  const joinVoice = useVoiceStore((s) => s.joinVoice);
  const leaveVoice = useVoiceStore((s) => s.leaveVoice);
  const toggleMic = useVoiceStore((s) => s.toggleMic);
  const toggleSpeaker = useVoiceStore((s) => s.toggleSpeaker);

  const [expanded, setExpanded] = useState(false);
  const [corner, setCorner] = useState<'top-right' | 'bottom-left'>('top-right');

  const me = players.find((p) => p.id === myId);

  // Auto-connect to voice room & automatically request system microphone/speaker on room entry
  useEffect(() => {
    if (room && me && !me.is_bot) {
      joinVoice(room.id, me.id, me.name);
    }
    return () => {
      leaveVoice();
    };
  }, [room, me, joinVoice, leaveVoice]);

  if (!room || !me) return null;

  // Filter human peers connected to voice
  const humanPlayers = players.filter((p) => !p.is_bot);
  const peerList = Object.values(peers);
  const connectedCount = peerList.length + 1; // peers + self

  const cornerClasses =
    corner === 'top-right'
      ? 'top-11 right-2 sm:top-12 sm:right-3.5'
      : 'bottom-26 left-2 sm:bottom-28 sm:left-3.5';

  return (
    <aside
      aria-label="Room Voice Chat"
      className={`fixed ${cornerClasses} z-30 flex flex-col items-end select-none pointer-events-auto transition-all duration-300`}
    >
      {/* Main Pill Bar */}
      <div className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-full glass border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {/* Voice Room Status & Count Indicator */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-white/10 active:scale-95 transition-all text-xs font-semibold text-white/90"
          title={`Room Voice (${connectedCount} connected). Click to view players.`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSpeaking ? 'bg-emerald-400' : 'bg-sky-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isSpeaking ? 'bg-emerald-500' : isMuted ? 'bg-rose-500' : 'bg-sky-500'
              }`}
            />
          </span>
          <span className="text-[10px] sm:text-xs font-bold tracking-tight text-white/80 hidden xs:inline">
            Voice
          </span>
          <span className="text-[10px] sm:text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-white/15 text-sky-200">
            {connectedCount}
          </span>
          {expanded ? (
            <HiOutlineChevronUp className="text-white/60 text-xs" />
          ) : (
            <HiOutlineChevronDown className="text-white/60 text-xs" />
          )}
        </button>

        <div className="h-4 w-[1px] bg-white/20 mx-0.5" />

        {/* Microphone Button */}
        <button
          onClick={() => toggleMic()}
          aria-label={isMuted ? 'Turn on microphone' : 'Turn off microphone'}
          title={isMuted ? 'Mic is OFF (Click to turn ON)' : 'Mic is ON (Click to turn OFF)'}
          className={`relative group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-200 active:scale-90 ${
            isMuted
              ? 'bg-rose-600/85 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] border border-rose-400/50'
              : isSpeaking
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_18px_rgba(16,185,129,0.9)] border-2 border-emerald-300 ring-2 ring-emerald-400/50 animate-pulse'
              : 'bg-emerald-600/80 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] border border-emerald-400/40'
          }`}
        >
          {isSpeaking && !isMuted && (
            <span className="absolute -inset-1 rounded-full border border-emerald-400 animate-ping pointer-events-none" />
          )}
          {isMuted ? (
            <IoMicOff className="text-base sm:text-lg" />
          ) : (
            <IoMic className="text-base sm:text-lg" />
          )}
        </button>

        {/* Speaker Button */}
        <button
          onClick={() => toggleSpeaker()}
          aria-label={isDeafened ? 'Turn on speaker' : 'Turn off speaker'}
          title={isDeafened ? 'Speaker is OFF (Click to turn ON)' : 'Speaker is ON (Click to turn OFF)'}
          className={`relative group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-200 active:scale-90 ${
            isDeafened
              ? 'bg-rose-600/85 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] border border-rose-400/50'
              : 'bg-sky-600/80 hover:bg-sky-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.5)] border border-sky-400/40'
          }`}
        >
          {isDeafened ? (
            <IoVolumeMute className="text-base sm:text-lg" />
          ) : (
            <IoVolumeHigh className="text-base sm:text-lg" />
          )}
        </button>
      </div>

      {/* Mic permission or connection notice if present */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          className="mt-2 w-64 sm:w-72 p-3 rounded-2xl bg-rose-950/95 border border-rose-500/50 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-white text-xs flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[11px] sm:text-xs">
              <HiOutlineLockClosed className="text-sm shrink-0" />
              <span>Microphone Access Notice</span>
            </div>
            <button
              onClick={clearError}
              className="text-white/60 hover:text-white p-0.5 rounded transition-colors"
              title="Dismiss"
            >
              <HiOutlineXMark className="text-sm" />
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-rose-100/90 font-medium">
            {error}
          </p>

          <div className="flex items-center justify-between pt-1.5 border-t border-rose-500/30 text-[10px]">
            <span className="text-rose-300/80 font-semibold">Address bar ➔ 🔒</span>
            <button
              onClick={() => {
                clearError();
                toggleMic();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-[10px] sm:text-[11px] active:scale-95 shadow transition-all"
            >
              <HiOutlineArrowPath className="text-xs" />
              <span>Ask Again</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Expandable Voice Participants Drawer */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            className="mt-2 w-56 sm:w-64 p-3 rounded-2xl glass border border-white/20 shadow-2xl backdrop-blur-2xl flex flex-col gap-2.5 text-xs text-white"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <div className="flex items-center gap-1.5 font-bold text-sky-300 text-[11px] sm:text-xs">
                <HiOutlineUsers />
                <span>Room Voice Chat</span>
              </div>
              <button
                onClick={() =>
                  setCorner((c) => (c === 'top-right' ? 'bottom-left' : 'top-right'))
                }
                className="text-[10px] text-white/50 hover:text-white px-1.5 py-0.5 rounded bg-white/10"
                title="Move widget to another corner"
              >
                Dock {corner === 'top-right' ? 'Bottom' : 'Top'}
              </button>
            </div>

            {/* List of room players and voice status */}
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              {/* Local User */}
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/10 border border-white/10">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow relative ${
                      isSpeaking ? 'ring-2 ring-emerald-400 animate-pulse' : ''
                    }`}
                    style={{ background: me.avatar_color }}
                  >
                    {me.name.slice(0, 1).toUpperCase()}
                    {isSpeaking && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white/90 text-[11px]">
                      {me.name} <span className="text-[9px] text-sky-400">(You)</span>
                    </span>
                    <span className="text-[9px] text-white/50">
                      {isSpeaking ? 'Speaking...' : isMuted ? 'Muted' : 'Listening'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  {isMuted ? (
                    <IoMicOff className="text-rose-400" title="Microphone muted" />
                  ) : (
                    <IoMic className="text-emerald-400" title="Microphone active" />
                  )}
                  {isDeafened ? (
                    <IoVolumeMute className="text-rose-400" title="Speaker muted" />
                  ) : (
                    <IoVolumeHigh className="text-sky-400" title="Speaker active" />
                  )}
                </div>
              </div>

              {/* Other room human members */}
              {humanPlayers
                .filter((p) => p.id !== me.id)
                .map((p) => {
                  const peerState = peers[p.id];
                  const isPeerConnected = Boolean(peerState);
                  const isPeerSpeaking = peerState?.isSpeaking ?? false;
                  const isPeerMuted = peerState?.isMuted ?? false;
                  const isPeerDeafened = peerState?.isDeafened ?? false;

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-black/20 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow relative ${
                            isPeerSpeaking ? 'ring-2 ring-emerald-400 animate-pulse' : ''
                          }`}
                          style={{ background: p.avatar_color }}
                        >
                          {p.name.slice(0, 1).toUpperCase()}
                          {isPeerSpeaking && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-white/90 text-[11px]">
                            {p.name}
                          </span>
                          <span className="text-[9px] text-white/40">
                            {!isPeerConnected
                              ? 'Connecting...'
                              : isPeerSpeaking
                              ? 'Speaking...'
                              : isPeerMuted
                              ? 'Muted'
                              : 'Connected'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        {isPeerMuted ? (
                          <IoMicOff className="text-rose-400" title="Muted" />
                        ) : (
                          <IoMic className="text-emerald-400" title="Mic live" />
                        )}
                        {isPeerDeafened ? (
                          <IoVolumeMute className="text-rose-400" title="Deafened" />
                        ) : (
                          <IoVolumeHigh className="text-sky-400" title="Audio on" />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
              <span>Fast P2P encrypted audio</span>
              <span className="text-emerald-400 font-semibold">● Active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
