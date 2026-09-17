import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface VoicePeerState {
  playerId: string;
  name: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  connectionState?: string;
}

export type VoiceStateListener = (state: {
  isJoined: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  peers: Record<string, VoicePeerState>;
  error: string | null;
}) => void;

/**
 * Robust ICE Configuration: Includes Google STUN + OpenRelay TURN servers
 * (UDP & TCP on ports 80/443).
 * TURN is essential for mobile cellular networks (4G/5G), mobile hotspots,
 * and restrictive home/office NAT firewalls.
 */
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
  iceCandidatePoolSize: 10,
};

class VoiceChatManager {
  private roomId: string | null = null;
  private myId: string | null = null;
  private myName: string = '';
  private channel: RealtimeChannel | null = null;

  private localStream: MediaStream | null = null;
  private isRealMic: boolean = false;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private negotiatingPeers: Set<string> = new Set();

  private isMuted: boolean = true;
  private isDeafened: boolean = false;
  private isSpeaking: boolean = false;
  private peers: Map<string, VoicePeerState> = new Map();
  private error: string | null = null;
  private isJoined: boolean = false;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadInterval: ReturnType<typeof setInterval> | null = null;

  private listeners: Set<VoiceStateListener> = new Set();

  constructor() {
    this.setupAutoplayUnlocker();
  }

  /**
   * Browser autoplay policy requires an explicit user gesture (click, tap)
   * to unlock audio playback. This listener ensures that any screen tap
   * immediately unblocks and plays all remote participant audio streams.
   */
  private setupAutoplayUnlocker() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.remoteAudioElements.forEach((audioEl) => {
        if (!this.isDeafened && audioEl.paused) {
          audioEl.muted = false;
          audioEl.volume = 1.0;
          audioEl.play().catch(() => {});
        }
      });
    };

    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const peersObj: Record<string, VoicePeerState> = {};
    this.peers.forEach((v, k) => {
      peersObj[k] = { ...v };
    });

    const snapshot = {
      isJoined: this.isJoined,
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      isSpeaking: this.isSpeaking,
      peers: peersObj,
      error: this.error,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error notifying voice listener:', err);
      }
    });
  }

  /**
   * Live DOM container for remote audio elements.
   * Rendered with minimal size and 0.01 opacity in the viewport
   * so mobile operating systems never suspend or throttle audio.
   */
  private getAudioContainer(): HTMLElement {
    let container = document.getElementById('game-voice-audio-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'game-voice-audio-container';
      container.style.position = 'fixed';
      container.style.bottom = '0px';
      container.style.right = '0px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.overflow = 'hidden';
      container.style.pointerEvents = 'none';
      container.style.opacity = '0.01';
      container.style.zIndex = '-1';
      document.body.appendChild(container);
    }
    return container;
  }

  private getOrCreateAudioElement(peerId: string): HTMLAudioElement {
    let audioEl = this.remoteAudioElements.get(peerId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = `remote-audio-${peerId}`;
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.setAttribute('webkit-playsinline', 'true');
      audioEl.volume = 1.0;
      audioEl.muted = this.isDeafened;

      const container = this.getAudioContainer();
      container.appendChild(audioEl);
      this.remoteAudioElements.set(peerId, audioEl);
    }
    return audioEl;
  }

  /**
   * Captures physical microphone stream.
   * If forcePrompt is true (e.g. user clicked mic button), browser asks for permission.
   * If false (background setup on room join), attempts silent acquisition if allowed.
   */
  public async requestSystemPermissions(forcePrompt: boolean = false): Promise<boolean> {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        if (forcePrompt) {
          this.error =
            'Microphone access is unavailable. Please ensure you are accessing via HTTPS or localhost.';
          this.notify();
        }
        return false;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err2: any) {
          if (forcePrompt) {
            console.warn('Microphone acquisition note:', err2);
            if (err2?.name === 'NotAllowedError' || err2?.name === 'PermissionDeniedError') {
              this.error =
                'Microphone permission denied. Please click the lock icon in your address bar to allow microphone access.';
            } else {
              // No physical mic on laptop - inform user that speaker mode is active
              this.error =
                'No microphone hardware detected on this computer. Speaker mode is active — you can hear other players.';
            }
            this.isMuted = true;
            this.notify();
            return false;
          }
        }
      }

      if (stream) {
        if (this.localStream && !this.isRealMic) {
          this.localStream.getTracks().forEach((t) => t.stop());
        }

        this.localStream = stream;
        this.isRealMic = true;
        this.error = null;

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !this.isMuted;
        }

        this.setupVAD(stream);
        this.ensureAudioContext();

        // Update all active peer connections with the live microphone track
        if (audioTrack) {
          await this.replaceAudioTrackOnAllPeers(audioTrack, stream);
        }

        this.broadcastState();
        this.notify();
        return true;
      } else {
        // Fallback placeholder stream so WebRTC SDP includes audio transceiver
        if (!this.localStream) {
          this.localStream = this.createSyntheticAudioStream();
          this.isRealMic = false;
        }
        return false;
      }
    } catch (err: any) {
      console.warn('System audio setup notice:', err);
      if (forcePrompt) {
        this.error = err?.message || 'Failed to initialize microphone.';
        this.notify();
      }
      return false;
    }
  }

  private async replaceAudioTrackOnAllPeers(newTrack: MediaStreamTrack, stream: MediaStream) {
    for (const [peerId, pc] of this.peerConnections.entries()) {
      try {
        const senders = pc.getSenders();
        const audioSender = senders.find(
          (s) => s.track?.kind === 'audio' || !s.track
        );
        if (audioSender) {
          await audioSender.replaceTrack(newTrack);
          console.log(`[Voice] Audio track updated seamlessly for peer ${peerId}`);
        } else {
          pc.addTrack(newTrack, stream);
          console.log(`[Voice] Added audio track for peer ${peerId}`);
          await this.createAndSendOffer(peerId, true);
        }
      } catch (e) {
        console.warn(`[Voice] Error updating audio track for peer ${peerId}:`, e);
      }
    }
  }

  private ensureAudioContext(): AudioContext | null {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return this.audioContext;
    } catch {
      return null;
    }
  }

  public async join(roomId: string, myId: string, myName: string): Promise<void> {
    if (this.isJoined && this.roomId === roomId && this.myId === myId) {
      return;
    }

    this.leave();

    this.roomId = roomId;
    this.myId = myId;
    this.myName = myName;
    this.error = null;
    this.isMuted = true;
    this.isDeafened = false;

    this.ensureAudioContext();

    // Background microphone acquisition (seamless if previously allowed)
    this.requestSystemPermissions(false).catch(() => {});

    try {
      this.channel = supabase.channel(`voice-${roomId}`, {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: myId },
        },
      });

      this.channel
        .on('broadcast', { event: 'voice:join' }, ({ payload }) => this.handlePeerJoin(payload))
        .on('broadcast', { event: 'voice:join-ack' }, ({ payload }) => this.handlePeerJoinAck(payload))
        .on('broadcast', { event: 'voice:offer' }, ({ payload }) => this.handleReceiveOffer(payload))
        .on('broadcast', { event: 'voice:answer' }, ({ payload }) => this.handleReceiveAnswer(payload))
        .on('broadcast', { event: 'voice:candidate' }, ({ payload }) => this.handleReceiveCandidate(payload))
        .on('broadcast', { event: 'voice:state' }, ({ payload }) => this.handlePeerStateUpdate(payload))
        .on('broadcast', { event: 'voice:leave' }, ({ payload }) => this.handlePeerLeave(payload))
        .on('presence', { event: 'sync' }, () => this.handlePresenceSync())
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.isJoined = true;
            this.notify();

            if (this.channel) {
              await this.channel.track({
                playerId: this.myId,
                name: this.myName,
                isMuted: this.isMuted,
                isDeafened: this.isDeafened,
                isSpeaking: this.isSpeaking,
              });
            }

            this.broadcastJoin();
          }
        });
    } catch (err: any) {
      console.warn('Voice channel setup error:', err);
      this.error = err?.message || 'Failed to connect to voice channel.';
      this.notify();
    }
  }

  private handlePresenceSync() {
    if (!this.channel || !this.myId) return;

    const state = this.channel.presenceState();
    Object.values(state).forEach((presences: any) => {
      presences.forEach((presence: any) => {
        if (presence.playerId && presence.playerId !== this.myId) {
          const peerId = presence.playerId;
          const isKnown = this.peers.has(peerId);

          if (!isKnown) {
            this.peers.set(peerId, {
              playerId: peerId,
              name: presence.name || 'Player',
              isMuted: presence.isMuted ?? false,
              isDeafened: presence.isDeafened ?? false,
              isSpeaking: presence.isSpeaking ?? false,
              connectionState: 'connecting',
            });
            this.notify();

            // The peer with the lower ID initiates the offer
            if (this.myId && this.myId < peerId) {
              this.createAndSendOffer(peerId);
            }
          }
        }
      });
    });
  }

  private createSyntheticAudioStream(): MediaStream {
    try {
      const ctx = this.ensureAudioContext();
      if (!ctx) return new MediaStream();

      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.00001;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();

      return dest.stream;
    } catch {
      return new MediaStream();
    }
  }

  private setupVAD(stream: MediaStream) {
    try {
      if (this.vadInterval) {
        clearInterval(this.vadInterval);
        this.vadInterval = null;
      }

      const ctx = this.ensureAudioContext();
      if (!ctx) return;

      const source = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);

      const buffer = new Uint8Array(this.analyser.frequencyBinCount);
      let speakingFrames = 0;

      this.vadInterval = setInterval(() => {
        if (!this.analyser || this.isMuted || !this.localStream?.getAudioTracks().some((t) => t.enabled)) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.broadcastState();
            this.notify();
          }
          return;
        }

        this.analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const average = sum / buffer.length;
        const isNowSpeaking = average > 14;

        if (isNowSpeaking) {
          speakingFrames = Math.min(speakingFrames + 1, 10);
        } else {
          speakingFrames = Math.max(speakingFrames - 1, 0);
        }

        const currentlySpeaking = speakingFrames >= 2;
        if (currentlySpeaking !== this.isSpeaking) {
          this.isSpeaking = currentlySpeaking;
          this.broadcastState();
          this.notify();
        }
      }, 150);
    } catch (e) {
      console.warn('VAD setup skipped:', e);
    }
  }

  private broadcastJoin() {
    if (!this.channel || !this.myId) return;
    this.channel.send({
      type: 'broadcast',
      event: 'voice:join',
      payload: {
        playerId: this.myId,
        name: this.myName,
        isMuted: this.isMuted,
        isDeafened: this.isDeafened,
        isSpeaking: this.isSpeaking,
      },
    });
  }

  private broadcastState() {
    if (!this.channel || !this.myId) return;
    this.channel.send({
      type: 'broadcast',
      event: 'voice:state',
      payload: {
        playerId: this.myId,
        isMuted: this.isMuted,
        isDeafened: this.isDeafened,
        isSpeaking: this.isSpeaking,
      },
    });
  }

  private async handlePeerJoin(payload: {
    playerId: string;
    name: string;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
  }) {
    if (!payload || payload.playerId === this.myId) return;

    this.peers.set(payload.playerId, {
      playerId: payload.playerId,
      name: payload.name,
      isMuted: payload.isMuted ?? false,
      isDeafened: payload.isDeafened ?? false,
      isSpeaking: payload.isSpeaking ?? false,
      connectionState: 'connecting',
    });
    this.notify();

    // Reply with join-ack so the newly joined peer is immediately aware of us
    if (this.channel && this.myId) {
      this.channel.send({
        type: 'broadcast',
        event: 'voice:join-ack',
        payload: {
          to: payload.playerId,
          playerId: this.myId,
          name: this.myName,
          isMuted: this.isMuted,
          isDeafened: this.isDeafened,
          isSpeaking: this.isSpeaking,
        },
      });
    }

    // Lower ID initiates offer
    if (this.myId && this.myId < payload.playerId) {
      await this.createAndSendOffer(payload.playerId);
    }
  }

  private async handlePeerJoinAck(payload: {
    to: string;
    playerId: string;
    name: string;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
  }) {
    if (!payload || payload.to !== this.myId || payload.playerId === this.myId) return;

    this.peers.set(payload.playerId, {
      playerId: payload.playerId,
      name: payload.name,
      isMuted: payload.isMuted ?? false,
      isDeafened: payload.isDeafened ?? false,
      isSpeaking: payload.isSpeaking ?? false,
      connectionState: 'connecting',
    });
    this.notify();

    if (this.myId && this.myId < payload.playerId) {
      await this.createAndSendOffer(payload.playerId);
    }
  }

  private async getOrCreatePeerConnection(peerId: string): Promise<RTCPeerConnection> {
    let pc = this.peerConnections.get(peerId);
    if (pc && pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
      return pc;
    }

    if (pc) {
      pc.close();
    }

    pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerId, pc);

    if (!this.pendingIceCandidates.has(peerId)) {
      this.pendingIceCandidates.set(peerId, []);
    }

    // Ensure audio track or transceiver is attached
    const audioTrack = this.localStream?.getAudioTracks()[0] ?? null;
    if (audioTrack && this.localStream) {
      pc.addTrack(audioTrack, this.localStream);
    } else {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    }

    // ICE candidate exchange
    pc.onicecandidate = (event) => {
      if (event.candidate && this.channel && this.myId) {
        this.channel.send({
          type: 'broadcast',
          event: 'voice:candidate',
          payload: {
            from: this.myId,
            to: peerId,
            candidate: event.candidate,
          },
        });
      }
    };

    // Incoming remote audio track handler
    pc.ontrack = (event) => {
      console.log(`[Voice] Incoming remote audio track from ${peerId}:`, event.track.id);

      let remoteStream: MediaStream;
      if (event.streams && event.streams[0]) {
        remoteStream = event.streams[0];
      } else {
        remoteStream = new MediaStream([event.track]);
      }

      const audioEl = this.getOrCreateAudioElement(peerId);
      audioEl.srcObject = remoteStream;
      audioEl.muted = this.isDeafened;
      audioEl.volume = 1.0;

      const attemptPlay = () => {
        if (audioEl && !this.isDeafened) {
          audioEl.muted = false;
          audioEl.volume = 1.0;
          audioEl.play().catch((err) => {
            console.warn(`[Voice] Autoplay note for ${peerId}:`, err?.message || err);
          });
        }
      };

      event.track.onunmute = () => {
        console.log(`[Voice] Audio track unmuted for ${peerId}`);
        attemptPlay();
      };

      attemptPlay();
    };

    // ICE state monitoring with automatic restart
    pc.oniceconnectionstatechange = () => {
      const iceState = pc?.iceConnectionState;
      console.log(`[Voice] Peer ${peerId} ICE state: ${iceState}`);
      if (iceState === 'failed') {
        console.warn(`[Voice] Peer ${peerId} ICE check failed, triggering ICE restart...`);
        this.restartPeerConnection(peerId);
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      const cState = pc?.connectionState;
      console.log(`[Voice] Connection state with ${peerId}: ${cState}`);
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.connectionState = cState;
        this.notify();
      }

      if (cState === 'failed') {
        console.warn(`[Voice] Peer connection failed with ${peerId}, restarting...`);
        this.restartPeerConnection(peerId);
      }
    };

    return pc;
  }

  public async restartPeerConnection(peerId: string) {
    this.negotiatingPeers.delete(peerId);
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;

    try {
      if (typeof pc.restartIce === 'function') {
        pc.restartIce();
      }
      if (this.myId && this.myId < peerId) {
        await this.createAndSendOffer(peerId, true);
      }
    } catch (e) {
      console.warn(`[Voice] Error restarting peer connection with ${peerId}:`, e);
    }
  }

  private async createAndSendOffer(targetPeerId: string, isRestart: boolean = false) {
    if (this.negotiatingPeers.has(targetPeerId) && !isRestart) {
      return;
    }

    try {
      const pc = await this.getOrCreatePeerConnection(targetPeerId);
      if (pc.signalingState !== 'stable' && !isRestart) {
        return;
      }

      this.negotiatingPeers.add(targetPeerId);

      const offer = await pc.createOffer(isRestart ? { iceRestart: true } : {});
      await pc.setLocalDescription(offer);

      if (this.channel && this.myId) {
        this.channel.send({
          type: 'broadcast',
          event: 'voice:offer',
          payload: {
            from: this.myId,
            to: targetPeerId,
            offer,
          },
        });
      }
    } catch (err) {
      console.warn('Error creating WebRTC offer for', targetPeerId, err);
      this.negotiatingPeers.delete(targetPeerId);
    }
  }

  private async handleReceiveOffer(payload: { from: string; to: string; offer: RTCSessionDescriptionInit }) {
    if (!payload || payload.to !== this.myId) return;

    try {
      const pc = await this.getOrCreatePeerConnection(payload.from);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

      await this.drainQueuedCandidates(payload.from, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (this.channel && this.myId) {
        this.channel.send({
          type: 'broadcast',
          event: 'voice:answer',
          payload: {
            from: this.myId,
            to: payload.from,
            answer,
          },
        });
      }
    } catch (err) {
      console.warn('Error handling incoming WebRTC offer from', payload.from, err);
    }
  }

  private async handleReceiveAnswer(payload: { from: string; to: string; answer: RTCSessionDescriptionInit }) {
    if (!payload || payload.to !== this.myId) return;

    this.negotiatingPeers.delete(payload.from);
    try {
      const pc = this.peerConnections.get(payload.from);
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        await this.drainQueuedCandidates(payload.from, pc);
      }
    } catch (err) {
      console.warn('Error setting remote description for answer from', payload.from, err);
    }
  }

  private async handleReceiveCandidate(payload: { from: string; to: string; candidate: RTCIceCandidateInit }) {
    if (!payload || payload.to !== this.myId) return;

    try {
      const pc = this.peerConnections.get(payload.from);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } else {
        const queue = this.pendingIceCandidates.get(payload.from) || [];
        queue.push(payload.candidate);
        this.pendingIceCandidates.set(payload.from, queue);
      }
    } catch (err) {
      console.warn('Error adding ICE candidate from', payload.from, err);
    }
  }

  private async drainQueuedCandidates(peerId: string, pc: RTCPeerConnection) {
    const queue = this.pendingIceCandidates.get(peerId) || [];
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('Error applying queued ICE candidate:', err);
      }
    }
    this.pendingIceCandidates.set(peerId, []);
  }

  private handlePeerStateUpdate(payload: {
    playerId: string;
    isMuted?: boolean;
    isDeafened?: boolean;
    isSpeaking?: boolean;
  }) {
    if (!payload || payload.playerId === this.myId) return;

    const existing = this.peers.get(payload.playerId);
    if (existing) {
      if (payload.isMuted !== undefined) existing.isMuted = payload.isMuted;
      if (payload.isDeafened !== undefined) existing.isDeafened = payload.isDeafened;
      if (payload.isSpeaking !== undefined) existing.isSpeaking = payload.isSpeaking;
      this.notify();
    }
  }

  private handlePeerLeave(payload: { playerId: string }) {
    if (!payload) return;
    this.cleanupPeer(payload.playerId);
    this.peers.delete(payload.playerId);
    this.notify();
  }

  private cleanupPeer(peerId: string) {
    this.negotiatingPeers.delete(peerId);
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    const audioEl = this.remoteAudioElements.get(peerId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      this.remoteAudioElements.delete(peerId);
    }
    this.pendingIceCandidates.delete(peerId);
  }

  /**
   * User clicks mic button to toggle mute/unmute.
   * Prompts browser for microphone access if not yet granted.
   */
  public async toggleMute(): Promise<boolean> {
    if (this.isMuted) {
      // User wants to un-mute and speak
      if (!this.isRealMic || !this.localStream || !this.localStream.getAudioTracks().some((t) => t.readyState === 'live')) {
        const granted = await this.requestSystemPermissions(true);
        if (!granted) {
          this.isMuted = true;
          this.notify();
          return true;
        }
      }

      this.isMuted = false;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      this.broadcastState();
      this.notify();
      return false;
    } else {
      // User wants to mute
      this.isMuted = true;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      this.isSpeaking = false;
      this.broadcastState();
      this.notify();
      return true;
    }
  }

  /**
   * User clicks speaker button to toggle deafen/undeafen.
   */
  public toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;

    this.ensureAudioContext();

    this.remoteAudioElements.forEach((el) => {
      el.muted = this.isDeafened;
      if (!this.isDeafened) {
        el.volume = 1.0;
        el.play().catch(() => {});
      }
    });

    this.broadcastState();
    this.notify();
    return this.isDeafened;
  }

  public clearError(): void {
    this.error = null;
    this.notify();
  }

  public leave(): void {
    if (!this.isJoined && !this.roomId) return;

    if (this.channel && this.myId) {
      try {
        this.channel.send({
          type: 'broadcast',
          event: 'voice:leave',
          payload: { playerId: this.myId },
        });
        supabase.removeChannel(this.channel);
      } catch (e) {
        console.warn('Error during channel leave:', e);
      }
    }

    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
      this.analyser = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.pendingIceCandidates.clear();
    this.negotiatingPeers.clear();

    this.remoteAudioElements.forEach((el) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    this.remoteAudioElements.clear();

    this.peers.clear();
    this.isJoined = false;
    this.isMuted = true;
    this.isDeafened = false;
    this.isSpeaking = false;
    this.isRealMic = false;
    this.roomId = null;
    this.myId = null;
    this.channel = null;

    this.notify();
  }
}

export const voiceChat = new VoiceChatManager();
