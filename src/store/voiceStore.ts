import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RemoteVoiceState {
  playerId: string;
  playerName: string;
  isMicOn: boolean;
  isSpeakerOn: boolean;
  isSpeaking: boolean;
}

interface VoiceStore {
  roomId: string | null;
  myId: string | null;
  myName: string | null;
  isJoined: boolean;
  isMicOn: boolean;
  isSpeakerOn: boolean;
  isSpeaking: boolean;
  hasPermission: boolean;
  isRequestingMic: boolean;
  isVirtualMic: boolean;
  error: string | null;
  remotePlayers: Record<string, RemoteVoiceState>;

  initVoice: (roomId: string, myId: string, myName: string) => Promise<void>;
  leaveVoice: () => void;
  toggleMic: () => Promise<void>;
  enableVirtualMic: () => void;
  toggleSpeaker: () => void;
  setSpeaker: (enabled: boolean) => void;
  clearError: () => void;
}

// Module-level WebRTC & Audio state to keep store serialization clean
let voiceChannel: RealtimeChannel | null = null;
let isChannelSubscribed = false;
let localStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let speechCheckInterval: ReturnType<typeof setInterval> | null = null;

const peerConnections = new Map<string, RTCPeerConnection>();
const remoteAudioElements = new Map<string, HTMLAudioElement>();
const iceCandidateQueues = new Map<string, RTCIceCandidateInit[]>();
const makingOfferMap = new Map<string, boolean>();

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

function getOrCreateAudioElement(peerId: string): HTMLAudioElement {
  let audio = remoteAudioElements.get(peerId);
  if (!audio) {
    audio = new Audio();
    audio.autoplay = true;
    // Required for iOS Safari to allow inline audio playback without fullscreen
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    (audio as any).playsInline = true;
    remoteAudioElements.set(peerId, audio);

    // Mobile browsers (especially iOS Safari) aggressively block autoplay.
    // We must attempt play() and set up user-gesture-based resume as fallback.
    const attemptPlay = () => {
      if (audio) {
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Autoplay blocked — register resume listeners for user gesture
            const resumeOnGesture = () => {
              audio?.play().catch(() => {});
              // Also resume any suspended AudioContext (mobile requirement)
              if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().catch(() => {});
              }
              window.removeEventListener('click', resumeOnGesture);
              window.removeEventListener('touchstart', resumeOnGesture);
              window.removeEventListener('touchend', resumeOnGesture);
            };
            window.addEventListener('click', resumeOnGesture, { once: true });
            window.addEventListener('touchstart', resumeOnGesture, { once: true });
            window.addEventListener('touchend', resumeOnGesture, { once: true });
          });
        }
      }
    };
    attemptPlay();
  }
  return audio;
}

function broadcastPresence(state: {
  isMicOn: boolean;
  isSpeakerOn: boolean;
  isSpeaking: boolean;
  joined?: boolean;
}) {
  if (!voiceChannel || !isChannelSubscribed) return;
  const store = useVoiceStore.getState();
  if (!store.myId) return;

  voiceChannel
    .send({
      type: 'broadcast',
      event: 'voice-presence',
      payload: {
        playerId: store.myId,
        playerName: store.myName || 'Player',
        isMicOn: state.isMicOn,
        isSpeakerOn: state.isSpeakerOn,
        isSpeaking: state.isSpeaking,
        joined: state.joined ?? false,
      },
    })
    .catch(() => {});
}

function sendSignal(toId: string, signal: any) {
  if (!voiceChannel || !isChannelSubscribed) return;
  const store = useVoiceStore.getState();
  if (!store.myId) return;

  voiceChannel
    .send({
      type: 'broadcast',
      event: 'voice-signal',
      payload: {
        fromId: store.myId,
        toId,
        signal,
      },
    })
    .catch(() => {});
}

function createPeerConnection(peerId: string): RTCPeerConnection {
  const existing = peerConnections.get(peerId);
  if (existing) {
    return existing;
  }

  const pc = new RTCPeerConnection(RTC_CONFIG);
  peerConnections.set(peerId, pc);
  makingOfferMap.set(peerId, false);
  iceCandidateQueues.set(peerId, []);

  // Add existing local track if available
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      pc.addTrack(audioTrack, localStream);
    }
  } else {
    // Add transceiver in sendrecv mode so we can immediately receive audio from others
    // This is critical: even without a mic, we need a transceiver to RECEIVE audio
    try {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    } catch {
      // Fallback for browsers that require track first
    }
  }

  // Handle incoming remote audio stream
  pc.ontrack = (event) => {
    console.log('[Voice] ontrack fired for peer', peerId, 'track:', event.track.kind, 'readyState:', event.track.readyState);
    const stream = event.streams[0] || new MediaStream([event.track]);
    const audio = getOrCreateAudioElement(peerId);
    audio.srcObject = stream;

    // Set volume and muted state
    const speakerOn = useVoiceStore.getState().isSpeakerOn;
    audio.muted = !speakerOn;
    audio.volume = 1.0;

    // Attempt to play — handle mobile autoplay restrictions
    const playAudio = () => {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch((playErr) => {
          console.warn('[Voice] Audio play blocked for peer', peerId, playErr);
          // On mobile, autoplay may be blocked — retry on next user gesture
          const retryPlay = () => {
            audio.play().catch(() => {});
            window.removeEventListener('click', retryPlay);
            window.removeEventListener('touchstart', retryPlay);
            window.removeEventListener('touchend', retryPlay);
          };
          window.addEventListener('click', retryPlay, { once: true });
          window.addEventListener('touchstart', retryPlay, { once: true });
          window.addEventListener('touchend', retryPlay, { once: true });
        });
      }
    };
    playAudio();
  };

  // ICE candidate discovery
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal(peerId, {
        type: 'candidate',
        candidate: event.candidate.toJSON(),
      });
    }
  };

  // Perfect negotiation logic
  pc.onnegotiationneeded = async () => {
    console.log('[Voice] Negotiation needed with peer', peerId);
    try {
      makingOfferMap.set(peerId, true);
      await pc.setLocalDescription();
      if (pc.localDescription) {
        sendSignal(peerId, {
          type: 'offer',
          sdp: pc.localDescription,
        });
      }
    } catch (err) {
      console.warn('[Voice] Negotiation error for peer', peerId, err);
    } finally {
      makingOfferMap.set(peerId, false);
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[Voice] ICE connection state for', peerId, ':', pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    console.log('[Voice] Connection state for', peerId, ':', pc.connectionState);
    if (pc.connectionState === 'failed') {
      // Attempt ICE restart before giving up
      console.log('[Voice] Connection failed, attempting ICE restart for', peerId);
      pc.restartIce();
    } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
      cleanupPeer(peerId);
    }
  };

  // Proactively initiate negotiation for the peer with the "higher" ID
  // This ensures an offer/answer exchange happens even when both peers have mic off
  const myId = useVoiceStore.getState().myId || '';
  if (myId > peerId) {
    // We are the polite peer — trigger an offer
    setTimeout(async () => {
      try {
        if (pc.signalingState === 'stable' && !makingOfferMap.get(peerId)) {
          console.log('[Voice] Proactively sending offer to', peerId);
          makingOfferMap.set(peerId, true);
          await pc.setLocalDescription();
          if (pc.localDescription) {
            sendSignal(peerId, {
              type: 'offer',
              sdp: pc.localDescription,
            });
          }
        }
      } catch (err) {
        console.warn('[Voice] Proactive offer error for', peerId, err);
      } finally {
        makingOfferMap.set(peerId, false);
      }
    }, 500);
  }

  return pc;
}

function cleanupPeer(peerId: string) {
  const pc = peerConnections.get(peerId);
  if (pc) {
    pc.close();
    peerConnections.delete(peerId);
  }
  const audio = remoteAudioElements.get(peerId);
  if (audio) {
    audio.pause();
    audio.srcObject = null;
    remoteAudioElements.delete(peerId);
  }
  iceCandidateQueues.delete(peerId);
  makingOfferMap.delete(peerId);

  useVoiceStore.setState((state) => {
    const updated = { ...state.remotePlayers };
    delete updated[peerId];
    return { remotePlayers: updated };
  });
}

function setupAudioAnalysis(stream: MediaStream) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioCtx();
    }

    // iOS Safari & mobile Chrome require explicit resume() tied to a user gesture.
    // Since toggleMic is always triggered by a button tap (user gesture), this resume
    // will succeed on mobile.
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        // If resume fails, set up a one-time touch/click listener as backup
        const resumeCtx = () => {
          audioContext?.resume().catch(() => {});
          window.removeEventListener('touchstart', resumeCtx);
          window.removeEventListener('click', resumeCtx);
        };
        window.addEventListener('touchstart', resumeCtx, { once: true });
        window.addEventListener('click', resumeCtx, { once: true });
      });
    }

    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.5;
    source.connect(analyserNode);

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    let speakingHoldCounter = 0;

    if (speechCheckInterval) clearInterval(speechCheckInterval);

    speechCheckInterval = setInterval(() => {
      const store = useVoiceStore.getState();
      if (!store.isMicOn || !analyserNode) {
        if (store.isSpeaking) {
          useVoiceStore.setState({ isSpeaking: false });
          broadcastPresence({
            isMicOn: store.isMicOn,
            isSpeakerOn: store.isSpeakerOn,
            isSpeaking: false,
          });
        }
        return;
      }

      analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;

      // Threshold for voice activity detection (~14 out of 255)
      const isAudible = average > 14;

      if (isAudible) {
        speakingHoldCounter = 3; // Keep speaking active for ~300ms to prevent flickering
        if (!store.isSpeaking) {
          useVoiceStore.setState({ isSpeaking: true });
          broadcastPresence({
            isMicOn: store.isMicOn,
            isSpeakerOn: store.isSpeakerOn,
            isSpeaking: true,
          });
        }
      } else {
        if (speakingHoldCounter > 0) {
          speakingHoldCounter--;
        } else if (store.isSpeaking) {
          useVoiceStore.setState({ isSpeaking: false });
          broadcastPresence({
            isMicOn: store.isMicOn,
            isSpeakerOn: store.isSpeakerOn,
            isSpeaking: false,
          });
        }
      }
    }, 100);
  } catch (err) {
    console.warn('Could not setup audio analysis:', err);
  }
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  roomId: null,
  myId: null,
  myName: null,
  isJoined: false,
  isMicOn: false, // DEFAULT: DISABLED as requested
  isSpeakerOn: true, // DEFAULT: ENABLED (hear others)
  isSpeaking: false,
  hasPermission: false,
  isRequestingMic: false,
  isVirtualMic: false,
  error: null,
  remotePlayers: {},

  initVoice: async (roomId: string, myId: string, myName: string) => {
    // If already joined for this room & player, do nothing
    if (get().isJoined && get().roomId === roomId && get().myId === myId) {
      return;
    }

    // Clean up any previous room session
    get().leaveVoice();

    set({
      roomId,
      myId,
      myName,
      isJoined: true,
      isMicOn: false, // Ensure default mic disabled
      isSpeakerOn: true,
      isSpeaking: false,
      isVirtualMic: false,
      error: null,
      remotePlayers: {},
    });

    const channelName = `voice-room-${roomId}`;
    voiceChannel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // Handle incoming presence updates (status of mic/speaker/speaking for peers)
    voiceChannel.on('broadcast', { event: 'voice-presence' }, ({ payload }) => {
      const { playerId, playerName, isMicOn, isSpeakerOn, isSpeaking, joined } = payload;
      if (!playerId || playerId === get().myId) return;

      set((state) => ({
        remotePlayers: {
          ...state.remotePlayers,
          [playerId]: {
            playerId,
            playerName: playerName || 'Player',
            isMicOn: Boolean(isMicOn),
            isSpeakerOn: isSpeakerOn !== false,
            isSpeaking: Boolean(isSpeaking),
          },
        },
      }));

      // Ensure peer connection exists
      createPeerConnection(playerId);

      // If this peer just announced they joined, announce our presence back so they know about us
      if (joined) {
        broadcastPresence({
          isMicOn: get().isMicOn,
          isSpeakerOn: get().isSpeakerOn,
          isSpeaking: get().isSpeaking,
          joined: false,
        });
      }
    });

    // Handle WebRTC signaling (offer, answer, ICE candidates)
    voiceChannel.on('broadcast', { event: 'voice-signal' }, async ({ payload }) => {
      const { fromId, toId, signal } = payload;
      const currentMyId = get().myId;
      if (toId !== currentMyId || !fromId) return;

      const pc = createPeerConnection(fromId);
      const isPolite = (currentMyId || '') > fromId; // Deterministic polite peer

      try {
        if (signal.type === 'offer') {
          const makingOffer = makingOfferMap.get(fromId) || false;
          const offerCollision = makingOffer || pc.signalingState !== 'stable';
          if (offerCollision && !isPolite) {
            // Impolite peer rejects incoming offer during collision
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Flush queued ICE candidates
          const queue = iceCandidateQueues.get(fromId) || [];
          for (const cand of queue) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          iceCandidateQueues.set(fromId, []);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          sendSignal(fromId, {
            type: 'answer',
            sdp: pc.localDescription,
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Flush queued ICE candidates
          const queue = iceCandidateQueues.get(fromId) || [];
          for (const cand of queue) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          iceCandidateQueues.set(fromId, []);
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            const queue = iceCandidateQueues.get(fromId) || [];
            queue.push(signal.candidate);
            iceCandidateQueues.set(fromId, queue);
          }
        }
      } catch (err) {
        console.warn('Signaling message error from', fromId, err);
      }
    });

    voiceChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isChannelSubscribed = true;
        // Announce our presence to all peers in the room
        broadcastPresence({
          isMicOn: false,
          isSpeakerOn: true,
          isSpeaking: false,
          joined: true,
        });
      } else {
        isChannelSubscribed = false;
      }
    });
  },

  leaveVoice: () => {
    isChannelSubscribed = false;
    if (speechCheckInterval) {
      clearInterval(speechCheckInterval);
      speechCheckInterval = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
      audioContext = null;
      analyserNode = null;
    }

    // Close all peer connections
    peerConnections.forEach((pc) => pc.close());
    peerConnections.clear();
    makingOfferMap.clear();
    iceCandidateQueues.clear();

    // Clean up remote audio elements
    remoteAudioElements.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteAudioElements.clear();

    if (voiceChannel) {
      supabase.removeChannel(voiceChannel);
      voiceChannel = null;
    }

    set({
      roomId: null,
      myId: null,
      myName: null,
      isJoined: false,
      isMicOn: false,
      isSpeaking: false,
      isVirtualMic: false,
      remotePlayers: {},
      error: null,
    });
  },

  toggleMic: async () => {
    const { isMicOn } = get();

    if (isMicOn) {
      // TURN MIC OFF (Mute)
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      set({ isMicOn: false, isSpeaking: false });
      broadcastPresence({
        isMicOn: false,
        isSpeakerOn: get().isSpeakerOn,
        isSpeaking: false,
      });
      return;
    }

    // TURN MIC ON (Unmute & request permission if needed)
    set({ isRequestingMic: true, error: null });

    try {
      // ── 1. Secure Context Check ──
      // Mobile browsers (Chrome, Safari, Firefox) REQUIRE HTTPS for getUserMedia.
      // Without HTTPS, navigator.mediaDevices is undefined on mobile.
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw {
          name: 'InsecureContextError',
          message: 'Microphone requires a secure (HTTPS) connection.',
        };
      }

      // ── 2. Check if mediaDevices API is available ──
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw {
          name: 'NotSupportedError',
          message: 'Your browser does not support microphone access.',
        };
      }

      // ── 3. Resume AudioContext on user gesture (required by iOS Safari & mobile Chrome) ──
      // Mobile browsers suspend AudioContext until a user gesture triggers resume()
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume().catch(() => {});
      }

      if (!localStream || localStream.getAudioTracks().length === 0) {
        let stream: MediaStream;

        // ── 4. Check for available audio input devices ──
        // On mobile, enumerateDevices may return empty labels until permission is granted,
        // but we can still detect if any audioinput device exists
        let hasAudioInput = true;
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter((d) => d.kind === 'audioinput');
          hasAudioInput = audioInputs.length > 0;
        } catch {
          // enumerateDevices may fail on older mobile browsers — proceed anyway
        }

        if (!hasAudioInput) {
          throw {
            name: 'NotFoundError',
            message: 'No microphone found.',
          };
        }

        // ── 5. Progressive constraint fallback for cross-device compatibility ──
        // Some mobile devices reject advanced constraints (echoCancellation, noiseSuppression)
        // Strategy: try advanced → basic constraints → minimal { audio: true }
        const constraintSets: MediaStreamConstraints[] = [
          // Attempt 1: Full constraints (works on most laptops & modern phones)
          {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          },
          // Attempt 2: Minimal audio (works on older/stricter mobile browsers)
          {
            audio: true,
            video: false,
          },
        ];

        let lastError: any = null;
        for (const constraints of constraintSets) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            lastError = null;
            break;
          } catch (attemptErr: any) {
            lastError = attemptErr;
            // If permission was explicitly denied, don't try the next constraint set
            if (
              attemptErr?.name === 'NotAllowedError' ||
              attemptErr?.name === 'PermissionDeniedError'
            ) {
              break;
            }
            // Otherwise continue to next (simpler) constraint set
          }
        }

        if (lastError || !stream!) {
          throw lastError || { name: 'UnknownError', message: 'Could not access microphone.' };
        }

        localStream = stream!;
        setupAudioAnalysis(stream!);

        // Attach track to all existing peer connections
        const newTrack = stream!.getAudioTracks()[0];
        peerConnections.forEach((pc, peerId) => {
          const senders = pc.getSenders();
          const audioSender = senders.find(
            (s) => s.track === null || (s.track && s.track.kind === 'audio'),
          );
          if (audioSender) {
            audioSender.replaceTrack(newTrack).catch((err) => {
              console.warn('[Voice] replaceTrack failed for', peerId, err);
              // Fallback: add as new track which triggers renegotiation
              try {
                pc.addTrack(newTrack, stream!);
              } catch {
                // Already has sender
              }
            });
          } else {
            pc.addTrack(newTrack, stream!);
          }

          // If the connection was never fully established (e.g. both joined with mic off),
          // replacing a track on an idle sender won't trigger onnegotiationneeded.
          // Force renegotiation so the remote peer actually receives our audio.
          if (
            pc.connectionState === 'new' ||
            pc.iceConnectionState === 'new' ||
            pc.connectionState === 'disconnected'
          ) {
            console.log('[Voice] Forcing renegotiation for peer', peerId, 'state:', pc.connectionState);
            pc.restartIce();
          }
        });
      } else {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }

      // ── 6. Ensure AudioContext is running after acquiring stream ──
      // iOS Safari often needs this after getUserMedia completes
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume().catch(() => {});
      }

      set({
        isMicOn: true,
        hasPermission: true,
        isRequestingMic: false,
        isVirtualMic: false,
        error: null,
      });

      broadcastPresence({
        isMicOn: true,
        isSpeakerOn: get().isSpeakerOn,
        isSpeaking: false,
      });
    } catch (err: any) {
      console.warn('Microphone access issue:', err);
      const isNotFound = err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError';
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      const isInsecure = err?.name === 'InsecureContextError';
      const isNotSupported = err?.name === 'NotSupportedError';
      const isOverconstrained = err?.name === 'OverconstrainedError';

      let errorMessage = 'Could not access microphone. Please check your device settings.';
      if (isInsecure) {
        errorMessage =
          'Microphone requires a secure (HTTPS) connection. Please access this app via HTTPS.';
      } else if (isNotSupported) {
        errorMessage =
          'Your browser does not support microphone access. Please use a modern browser (Chrome, Safari, Firefox).';
      } else if (isNotFound) {
        errorMessage =
          'No microphone found on your device. Please connect a microphone or check your device settings.';
      } else if (isDenied) {
        errorMessage =
          'Microphone permission denied. Please allow microphone access in your browser settings and try again.';
      } else if (isOverconstrained) {
        errorMessage =
          'Your microphone does not support the requested settings. Please try a different browser or device.';
      }

      set({
        isMicOn: false,
        hasPermission: false,
        isRequestingMic: false,
        error: errorMessage,
      });

      broadcastPresence({
        isMicOn: false,
        isSpeakerOn: get().isSpeakerOn,
        isSpeaking: false,
      });
    }
  },

  enableVirtualMic: () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) throw new Error('AudioContext not supported');

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const dst = ctx.createMediaStreamDestination();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);

      osc.connect(gain);
      gain.connect(dst);
      osc.start();

      localStream = dst.stream;
      setupAudioAnalysis(dst.stream);

      const newTrack = dst.stream.getAudioTracks()[0];
      peerConnections.forEach((pc) => {
        const senders = pc.getSenders();
        const audioSender = senders.find((s) => s.track?.kind === 'audio' || s.track === null);
        if (audioSender) {
          audioSender.replaceTrack(newTrack).catch(() => {});
        } else {
          pc.addTrack(newTrack, dst.stream);
        }
      });

      set({
        isMicOn: true,
        hasPermission: true,
        isRequestingMic: false,
        isVirtualMic: true,
        error: null,
      });

      broadcastPresence({
        isMicOn: true,
        isSpeakerOn: get().isSpeakerOn,
        isSpeaking: true,
      });
    } catch (err) {
      console.warn('Virtual mic failed:', err);
    }
  },

  toggleSpeaker: () => {
    const nextState = !get().isSpeakerOn;
    get().setSpeaker(nextState);
  },

  setSpeaker: (enabled: boolean) => {
    set({ isSpeakerOn: enabled });

    // Resume AudioContext if needed (mobile requirement)
    if (enabled && audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    // Update all remote audio elements
    remoteAudioElements.forEach((audio) => {
      audio.muted = !enabled;
      audio.volume = 1.0;
      if (enabled) {
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Mobile autoplay blocked — will resume on next user interaction
          });
        }
      }
    });

    broadcastPresence({
      isMicOn: get().isMicOn,
      isSpeakerOn: enabled,
      isSpeaking: get().isSpeaking,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
