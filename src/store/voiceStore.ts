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

// ─── Module-level WebRTC & Audio state ───
let voiceChannel: RealtimeChannel | null = null;
let isChannelSubscribed = false;
let localStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let speechCheckInterval: ReturnType<typeof setInterval> | null = null;

const peerConnections = new Map<string, RTCPeerConnection>();
const remoteAudioElements = new Map<string, HTMLAudioElement>();
const iceCandidateQueues = new Map<string, RTCIceCandidateInit[]>();

// ─── Polyfill for mediaDevices in older/embedded mobile browsers ───
if (typeof navigator !== 'undefined') {
  if (!navigator.mediaDevices) {
    (navigator as any).mediaDevices = {};
  }
  if (!navigator.mediaDevices.getUserMedia) {
    const legacyGUM =
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia;
    if (legacyGUM) {
      navigator.mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) =>
        new Promise((resolve, reject) => {
          legacyGUM.call(navigator, constraints, resolve, reject);
        });
    }
  }
}

// ─── ICE Configuration ───
// STUN servers are free and help discover public IPs.
// TURN servers are required when devices are on different networks (mobile data + WiFi).
// TURN credentials are fetched dynamically from Metered.ca free tier.
const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

let rtcConfig: RTCConfiguration = {
  iceServers: [...STUN_SERVERS],
  iceCandidatePoolSize: 10,
};

// Fetch TURN credentials from Metered.ca
async function fetchTurnCredentials(): Promise<void> {
  const appName = import.meta.env.VITE_METERED_APP_NAME || 'mugu';
  const apiKey =
    import.meta.env.VITE_METERED_API_KEY || '1390dc87173a86602340f96467d310709e70';
  const turnUsername =
    import.meta.env.VITE_METERED_USERNAME || 'fab0561ec4dadadb8ec9cdd9';
  const turnCredential =
    import.meta.env.VITE_METERED_CREDENTIAL || 'JuJRL7g7gnXXyusU';

  // Helper for static fallback
  const applyStaticCredentials = () => {
    if (turnUsername && turnCredential) {
      const staticTurnServers: RTCIceServer[] = [
        { urls: 'stun:stun.relay.metered.ca:80' },
        {
          urls: [
            'turn:global.relay.metered.ca:80',
            'turn:global.relay.metered.ca:80?transport=tcp',
            'turn:global.relay.metered.ca:443',
            'turns:global.relay.metered.ca:443?transport=tcp',
          ],
          username: turnUsername,
          credential: turnCredential,
        },
      ];
      rtcConfig = {
        iceServers: [...STUN_SERVERS, ...staticTurnServers],
        iceCandidatePoolSize: 10,
      };
      console.log('[Voice] ✅ Configured static Metered TURN servers');
      return true;
    }
    return false;
  };

  // Try dynamic API if valid key is available
  if (apiKey && !apiKey.startsWith('http://') && !apiKey.startsWith('https://')) {
    try {
      const response = await fetch(
        `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const turnServers: RTCIceServer[] = await response.json();
      console.log('[Voice] ✅ Fetched', turnServers.length, 'TURN servers from Metered.ca (app:', appName, ')');

      rtcConfig = {
        iceServers: [...STUN_SERVERS, ...turnServers],
        iceCandidatePoolSize: 10,
      };
      return;
    } catch (err) {
      console.warn('[Voice] ⚠️ Dynamic TURN fetch failed, trying static fallback:', err);
    }
  }

  // Fallback to static credentials if API fetch was skipped or failed
  if (applyStaticCredentials()) {
    return;
  }

  console.warn(
    '[Voice] ⚠️ No valid TURN credentials found — using STUN only.',
    'Voice chat will NOT work across different networks (e.g. mobile data + WiFi).',
  );
}

// ─── Helper: determine if we should be the offerer (deterministic by ID) ───
function shouldBeOfferer(myId: string, peerId: string): boolean {
  return myId > peerId;
}

// ─── Audio element management ───
function getOrCreateAudioElement(peerId: string): HTMLAudioElement {
  let audio = remoteAudioElements.get(peerId);
  if (!audio) {
    audio = new Audio();
    audio.autoplay = true;
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    (audio as any).playsInline = true;
    audio.volume = 1.0;
    audio.style.display = 'none';
    if (typeof document !== 'undefined' && document.body) {
      document.body.appendChild(audio);
    }
    remoteAudioElements.set(peerId, audio);
  }
  return audio;
}

function playAudioElement(audio: HTMLAudioElement, peerId: string) {
  const playPromise = audio.play();
  if (playPromise) {
    playPromise.catch((err) => {
      console.warn('[Voice] Autoplay blocked for', peerId, err.message);
      // Mobile browsers block autoplay — resume on next user interaction
      const resume = () => {
        audio.play().catch(() => {});
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }
        window.removeEventListener('click', resume);
        window.removeEventListener('touchstart', resume);
        window.removeEventListener('touchend', resume);
      };
      window.addEventListener('click', resume, { once: true });
      window.addEventListener('touchstart', resume, { once: true });
      window.addEventListener('touchend', resume, { once: true });
    });
  }
}

// ─── Broadcast presence to peers ───
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
    .then((status) => {
      if (status !== 'ok') {
        console.warn('[Voice] Presence broadcast status:', status);
      }
    })
    .catch((err) => {
      console.warn('[Voice] Presence broadcast failed:', err);
    });
}

// ─── Send WebRTC signal to a specific peer via broadcast ───
function sendSignal(toId: string, signal: any) {
  if (!voiceChannel || !isChannelSubscribed) {
    console.warn('[Voice] Cannot send signal — channel not subscribed');
    return;
  }
  const store = useVoiceStore.getState();
  if (!store.myId) return;

  console.log('[Voice] Sending signal', signal.type, 'to', toId.substring(0, 8));

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
    .then((status) => {
      if (status !== 'ok') {
        console.warn('[Voice] Signal send status:', status, 'for', signal.type);
      }
    })
    .catch((err) => {
      console.warn('[Voice] Signal send failed:', err);
    });
}

// ─── Create and send an offer to a peer ───
async function sendOffer(pc: RTCPeerConnection, peerId: string) {
  try {
    console.log('[Voice] Creating offer for', peerId.substring(0, 8));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (pc.localDescription) {
      sendSignal(peerId, {
        type: 'offer',
        sdp: pc.localDescription.toJSON(),
      });
    }
  } catch (err) {
    console.error('[Voice] Failed to send offer to', peerId.substring(0, 8), err);
  }
}

// ─── Create a peer connection ───
function createPeerConnection(peerId: string, isOfferer: boolean): RTCPeerConnection {
  const existing = peerConnections.get(peerId);
  if (existing) {
    return existing;
  }

  console.log('[Voice] Creating peer connection for', peerId.substring(0, 8), 'isOfferer:', isOfferer);

  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections.set(peerId, pc);
  iceCandidateQueues.set(peerId, []);

  // ── Add local audio track or create a silent placeholder ──
  if (localStream && localStream.getAudioTracks().length > 0) {
    const track = localStream.getAudioTracks()[0];
    pc.addTrack(track, localStream);
    console.log('[Voice] Added real audio track to peer', peerId.substring(0, 8));
  } else if (isOfferer) {
    // Offerer MUST add a transceiver so the SDP offer includes audio.
    // The answerer will get a transceiver automatically from the offer.
    try {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
      console.log('[Voice] Added audio transceiver for peer', peerId.substring(0, 8));
    } catch (e) {
      console.warn('[Voice] addTransceiver failed:', e);
    }
  }

  // ── Handle incoming remote audio ──
  pc.ontrack = (event) => {
    console.log(
      '[Voice] ✅ ontrack from', peerId.substring(0, 8),
      '| track:', event.track.kind,
      '| readyState:', event.track.readyState,
      '| streams:', event.streams.length,
    );

    const stream = event.streams[0] || new MediaStream([event.track]);
    const audio = getOrCreateAudioElement(peerId);
    audio.srcObject = stream;

    const speakerOn = useVoiceStore.getState().isSpeakerOn;
    audio.muted = !speakerOn;
    audio.volume = 1.0;

    playAudioElement(audio, peerId);

    // Also listen for track unmute (some browsers fire ontrack before data flows)
    event.track.onunmute = () => {
      console.log('[Voice] Track unmuted for', peerId.substring(0, 8));
      playAudioElement(audio, peerId);
    };
  };

  // ── ICE candidates ──
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal(peerId, {
        type: 'candidate',
        candidate: event.candidate.toJSON(),
      });
    }
  };

  pc.onicegatheringstatechange = () => {
    console.log('[Voice] ICE gathering state:', pc.iceGatheringState, 'for', peerId.substring(0, 8));
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[Voice] ICE state:', pc.iceConnectionState, 'for', peerId.substring(0, 8));
  };

  pc.onconnectionstatechange = () => {
    console.log('[Voice] Connection state:', pc.connectionState, 'for', peerId.substring(0, 8));
    if (pc.connectionState === 'connected') {
      console.log('[Voice] ✅ Successfully connected to', peerId.substring(0, 8));
    } else if (pc.connectionState === 'failed') {
      console.warn('[Voice] ❌ Connection failed for', peerId.substring(0, 8), '— retrying');
      // Destroy and recreate the connection
      retryConnection(peerId);
    } else if (pc.connectionState === 'disconnected') {
      // Wait 5s then retry if still disconnected
      setTimeout(() => {
        const currentPc = peerConnections.get(peerId);
        if (currentPc && currentPc.connectionState === 'disconnected') {
          console.warn('[Voice] Still disconnected from', peerId.substring(0, 8), '— retrying');
          retryConnection(peerId);
        }
      }, 5000);
    } else if (pc.connectionState === 'closed') {
      cleanupPeer(peerId);
    }
  };

  // ── Offerer initiates the SDP exchange ──
  if (isOfferer) {
    // Small delay to ensure event handlers on the answerer side are ready
    setTimeout(() => {
      if (pc.signalingState === 'stable') {
        sendOffer(pc, peerId);
      }
    }, 300);
  }

  return pc;
}

// ─── Retry a failed connection ───
function retryConnection(peerId: string) {
  const oldPc = peerConnections.get(peerId);
  if (oldPc) {
    oldPc.ontrack = null;
    oldPc.onicecandidate = null;
    oldPc.onconnectionstatechange = null;
    oldPc.oniceconnectionstatechange = null;
    oldPc.onicegatheringstatechange = null;
    oldPc.close();
  }
  peerConnections.delete(peerId);
  iceCandidateQueues.delete(peerId);

  const audio = remoteAudioElements.get(peerId);
  if (audio) {
    audio.pause();
    audio.srcObject = null;
    audio.remove();
    remoteAudioElements.delete(peerId);
  }

  // Recreate — determine if we're the offerer
  const myId = useVoiceStore.getState().myId || '';
  const isOfferer = shouldBeOfferer(myId, peerId);

  console.log('[Voice] Retrying connection for', peerId.substring(0, 8), 'isOfferer:', isOfferer);
  createPeerConnection(peerId, isOfferer);
}

// ─── Clean up a peer ───
function cleanupPeer(peerId: string) {
  console.log('[Voice] Cleaning up peer', peerId.substring(0, 8));
  const pc = peerConnections.get(peerId);
  if (pc) {
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onconnectionstatechange = null;
    pc.oniceconnectionstatechange = null;
    pc.onicegatheringstatechange = null;
    pc.close();
    peerConnections.delete(peerId);
  }
  const audio = remoteAudioElements.get(peerId);
  if (audio) {
    audio.pause();
    audio.srcObject = null;
    audio.remove();
  }
  remoteAudioElements.delete(peerId);
  iceCandidateQueues.delete(peerId);

  useVoiceStore.setState((state) => {
    const updated = { ...state.remotePlayers };
    delete updated[peerId];
    return { remotePlayers: updated };
  });
}

// ─── Audio analysis for speaking detection ───
function setupAudioAnalysis(stream: MediaStream) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioCtx();
    }

    // Resume AudioContext (required on mobile — must be in a user-gesture context)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
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

      const isAudible = average > 14;

      if (isAudible) {
        speakingHoldCounter = 3;
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

// ─── Handle incoming signaling message ───
async function handleSignal(fromId: string, signal: any) {
  const myId = useVoiceStore.getState().myId || '';
  const isOfferer = shouldBeOfferer(myId, fromId);

  console.log('[Voice] Received signal', signal.type, 'from', fromId.substring(0, 8));

  if (signal.type === 'offer') {
    // We received an offer → we are the answerer
    // Destroy existing connection if any (to handle renegotiation cleanly)
    const existingPc = peerConnections.get(fromId);
    if (existingPc) {
      // If we also sent an offer (collision), the peer with lower ID wins (is the offerer)
      // We are the answerer if we have the lower ID or if the other side is the offerer
      if (isOfferer && existingPc.signalingState !== 'stable') {
        // We are the offerer but received an offer — offer collision
        // The OFFERER (higher ID) should back off and accept the incoming offer
        console.log('[Voice] Offer collision — we are offerer, rolling back');
        existingPc.ontrack = null;
        existingPc.onicecandidate = null;
        existingPc.onconnectionstatechange = null;
        existingPc.oniceconnectionstatechange = null;
        existingPc.onicegatheringstatechange = null;
        existingPc.close();
        peerConnections.delete(fromId);
        iceCandidateQueues.delete(fromId);
      } else if (existingPc.signalingState !== 'stable') {
        // Not the offerer and not stable — something is off, recreate
        console.log('[Voice] Existing PC not stable, recreating');
        existingPc.ontrack = null;
        existingPc.onicecandidate = null;
        existingPc.onconnectionstatechange = null;
        existingPc.oniceconnectionstatechange = null;
        existingPc.onicegatheringstatechange = null;
        existingPc.close();
        peerConnections.delete(fromId);
        iceCandidateQueues.delete(fromId);
      }
    }

    // Create PC as answerer (isOfferer = false)
    const pc = createPeerConnection(fromId, false);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      console.log('[Voice] Set remote description (offer) from', fromId.substring(0, 8));

      // Flush queued ICE candidates
      const queue = iceCandidateQueues.get(fromId) || [];
      for (const cand of queue) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }
      iceCandidateQueues.set(fromId, []);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[Voice] Sending answer to', fromId.substring(0, 8));

      sendSignal(fromId, {
        type: 'answer',
        sdp: pc.localDescription!.toJSON(),
      });
    } catch (err) {
      console.error('[Voice] Error handling offer from', fromId.substring(0, 8), err);
    }
  } else if (signal.type === 'answer') {
    const pc = peerConnections.get(fromId);
    if (!pc) {
      console.warn('[Voice] No PC for answer from', fromId.substring(0, 8));
      return;
    }

    if (pc.signalingState !== 'have-local-offer') {
      console.warn('[Voice] Unexpected answer in state', pc.signalingState, 'from', fromId.substring(0, 8));
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      console.log('[Voice] Set remote description (answer) from', fromId.substring(0, 8));

      // Flush queued ICE candidates
      const queue = iceCandidateQueues.get(fromId) || [];
      for (const cand of queue) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }
      iceCandidateQueues.set(fromId, []);
    } catch (err) {
      console.error('[Voice] Error handling answer from', fromId.substring(0, 8), err);
    }
  } else if (signal.type === 'candidate' && signal.candidate) {
    const pc = peerConnections.get(fromId);
    if (!pc) {
      // Queue candidate — PC might not exist yet
      const queue = iceCandidateQueues.get(fromId) || [];
      queue.push(signal.candidate);
      iceCandidateQueues.set(fromId, queue);
      return;
    }

    try {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } else {
        const queue = iceCandidateQueues.get(fromId) || [];
        queue.push(signal.candidate);
        iceCandidateQueues.set(fromId, queue);
      }
    } catch (err) {
      console.warn('[Voice] Error adding ICE candidate from', fromId.substring(0, 8), err);
    }
  } else if (signal.type === 'renegotiate') {
    // Peer is asking us to renegotiate (e.g., they just turned on their mic)
    console.log('[Voice] Renegotiate request from', fromId.substring(0, 8));
    const existingPc = peerConnections.get(fromId);
    if (existingPc) {
      existingPc.ontrack = null;
      existingPc.onicecandidate = null;
      existingPc.onconnectionstatechange = null;
      existingPc.oniceconnectionstatechange = null;
      existingPc.onicegatheringstatechange = null;
      existingPc.close();
      peerConnections.delete(fromId);
    }
    iceCandidateQueues.delete(fromId);

    const audio = remoteAudioElements.get(fromId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      remoteAudioElements.delete(fromId);
    }

    // The renegotiate requester will send an offer, so we act as answerer
    // PC will be created when we receive the offer
  }
}

// ═══════════════════════════════════════════════════════════
// ─── STORE ───
// ═══════════════════════════════════════════════════════════

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  roomId: null,
  myId: null,
  myName: null,
  isJoined: false,
  isMicOn: false,
  isSpeakerOn: true,
  isSpeaking: false,
  hasPermission: false,
  isRequestingMic: false,
  isVirtualMic: false,
  error: null,
  remotePlayers: {},

  initVoice: async (roomId: string, myId: string, myName: string) => {
    if (get().isJoined && get().roomId === roomId && get().myId === myId) {
      return;
    }

    // Clean up previous session
    get().leaveVoice();

    // Fetch TURN credentials for reliable cross-network connectivity
    await fetchTurnCredentials();

    console.log('[Voice] Initializing voice for room', roomId, 'as', myId.substring(0, 8));

    set({
      roomId,
      myId,
      myName,
      isJoined: true,
      isMicOn: false,
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

    // ── Handle presence updates from peers ──
    voiceChannel.on('broadcast', { event: 'voice-presence' }, ({ payload }) => {
      const { playerId, playerName, isMicOn, isSpeakerOn, isSpeaking, joined } = payload;
      if (!playerId || playerId === get().myId) return;

      const current = get().remotePlayers[playerId];
      const nextMicOn = Boolean(isMicOn);
      const nextSpeakerOn = isSpeakerOn !== false;
      const nextSpeaking = Boolean(isSpeaking);
      const nextName = playerName || 'Player';

      if (
        !current ||
        current.isMicOn !== nextMicOn ||
        current.isSpeakerOn !== nextSpeakerOn ||
        current.isSpeaking !== nextSpeaking ||
        current.playerName !== nextName
      ) {
        set((state) => ({
          remotePlayers: {
            ...state.remotePlayers,
            [playerId]: {
              playerId,
              playerName: nextName,
              isMicOn: nextMicOn,
              isSpeakerOn: nextSpeakerOn,
              isSpeaking: nextSpeaking,
            },
          },
        }));
      }

      // Ensure peer connection exists
      const currentMyId = get().myId || '';
      const isOfferer = shouldBeOfferer(currentMyId, playerId);

      if (!peerConnections.has(playerId)) {
        createPeerConnection(playerId, isOfferer);
      }

      // Reply to newly joined peer so they know about us
      if (joined) {
        broadcastPresence({
          isMicOn: get().isMicOn,
          isSpeakerOn: get().isSpeakerOn,
          isSpeaking: get().isSpeaking,
          joined: false,
        });
      }
    });

    // ── Handle WebRTC signaling messages ──
    voiceChannel.on('broadcast', { event: 'voice-signal' }, async ({ payload }) => {
      const { fromId, toId, signal } = payload;
      const currentMyId = get().myId;
      if (toId !== currentMyId || !fromId) return;

      await handleSignal(fromId, signal);
    });

    // ── Subscribe to channel ──
    voiceChannel.subscribe((status) => {
      console.log('[Voice] Channel subscription status:', status);
      if (status === 'SUBSCRIBED') {
        isChannelSubscribed = true;
        // Announce our presence
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
    console.log('[Voice] Leaving voice room');
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

    peerConnections.forEach((pc) => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.onicegatheringstatechange = null;
      pc.close();
    });
    peerConnections.clear();
    iceCandidateQueues.clear();

    remoteAudioElements.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
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
      // TURN MIC OFF
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

    // TURN MIC ON
    set({ isRequestingMic: true, error: null });

    try {
      // ── 1. Secure context check (HTTPS required on mobile) ──
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw {
          name: 'InsecureContextError',
          message: 'Microphone requires a secure (HTTPS) connection.',
        };
      }

      // ── 2. mediaDevices API check ──
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw {
          name: 'NotSupportedError',
          message: 'Your browser does not support microphone access.',
        };
      }

      // ── 3. Resume AudioContext ──
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume().catch(() => {});
      }

      if (!localStream || localStream.getAudioTracks().length === 0) {
        let stream: MediaStream;

        // ── 4. Progressive constraint fallback (triggers native permission prompt) ──
        const constraintSets: MediaStreamConstraints[] = [
          {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          },
          { audio: true, video: false },
        ];

        let lastError: any = null;
        for (const constraints of constraintSets) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            lastError = null;
            break;
          } catch (attemptErr: any) {
            lastError = attemptErr;
            if (
              attemptErr?.name === 'NotAllowedError' ||
              attemptErr?.name === 'PermissionDeniedError'
            ) {
              break;
            }
          }
        }

        if (lastError || !stream!) {
          throw lastError || { name: 'UnknownError', message: 'Could not access microphone.' };
        }

        localStream = stream!;
        console.log('[Voice] Got microphone stream, tracks:', stream!.getAudioTracks().length);
        setupAudioAnalysis(stream!);

        // ── 5. Add track to all peer connections and renegotiate ──
        const newTrack = stream!.getAudioTracks()[0];
        const myId = get().myId || '';

        // Gather all peers: existing connections + known remote players
        const allPeerIds = new Set<string>([
          ...Array.from(peerConnections.keys()),
          ...Object.keys(get().remotePlayers),
        ]);

        for (const peerId of allPeerIds) {
          if (!peerId || peerId === myId) continue;
          const pc = peerConnections.get(peerId);

          if (pc) {
            const connectionAlive =
              pc.connectionState === 'connected' || pc.connectionState === 'connecting';

            if (connectionAlive) {
              // Connection exists — try to replace track on existing sender
              const senders = pc.getSenders();
              const audioSender = senders.find(
                (s) => s.track === null || (s.track && s.track.kind === 'audio'),
              );
              if (audioSender) {
                await audioSender.replaceTrack(newTrack).catch((err) => {
                  console.warn('[Voice] replaceTrack failed for', peerId.substring(0, 8), err);
                });
                console.log('[Voice] Replaced track on connected peer', peerId.substring(0, 8));
              } else {
                pc.addTrack(newTrack, stream!);
                console.log('[Voice] Added new track to connected peer', peerId.substring(0, 8));
              }
            } else {
              // Connection not alive — destroy and recreate with the new track
              console.log('[Voice] Connection not alive for', peerId.substring(0, 8), '— renegotiating');

              pc.ontrack = null;
              pc.onicecandidate = null;
              pc.onconnectionstatechange = null;
              pc.oniceconnectionstatechange = null;
              pc.onicegatheringstatechange = null;
              pc.close();
              peerConnections.delete(peerId);
              iceCandidateQueues.delete(peerId);

              const audio = remoteAudioElements.get(peerId);
              if (audio) {
                audio.pause();
                audio.srcObject = null;
                remoteAudioElements.delete(peerId);
              }

              const isOfferer = shouldBeOfferer(myId, peerId);
              if (isOfferer) {
                // We recreate as offerer with our track
                createPeerConnection(peerId, true);
              } else {
                // Ask the peer to renegotiate — they should send us a new offer
                sendSignal(peerId, { type: 'renegotiate' });
              }
            }
          } else {
            // Peer connection did not exist yet for this remote player
            const isOfferer = shouldBeOfferer(myId, peerId);
            createPeerConnection(peerId, isOfferer);
          }
        }
      } else {
        // Re-enable existing tracks
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }

      // ── 7. Ensure AudioContext is running ──
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

    // Resume AudioContext if needed (mobile)
    if (enabled && audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    remoteAudioElements.forEach((audio) => {
      audio.muted = !enabled;
      audio.volume = 1.0;
      if (enabled) {
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(() => {});
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
