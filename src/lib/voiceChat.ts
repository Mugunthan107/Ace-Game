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

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

class VoiceChatManager {
  private roomId: string | null = null;
  private myId: string | null = null;
  private myName: string = '';
  private channel: RealtimeChannel | null = null;

  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private isSpeaking: boolean = false;
  private peers: Map<string, VoicePeerState> = new Map();
  private error: string | null = null;
  private isJoined: boolean = false;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadInterval: ReturnType<typeof setInterval> | null = null;

  private listeners: Set<VoiceStateListener> = new Set();

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

  private getAudioContainer(): HTMLElement {
    let container = document.getElementById('game-voice-audio-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'game-voice-audio-container';
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Captures microphone stream and primes audio context for playback
   */
  public async requestSystemPermissions(): Promise<boolean> {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
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
        } catch (e) {
          console.warn('Microphone hardware acquisition notice:', e);
          stream = this.createSyntheticAudioStream();
        }
      }

      if (!stream) {
        stream = this.createSyntheticAudioStream();
      }

      this.localStream = stream;
      this.setupVAD(stream);
      this.isMuted = false;
      this.error = null;

      // Prime AudioContext for receiving remote audio
      this.ensureAudioContext();

      // Attach track to all existing peer connections
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        this.peerConnections.forEach((pc) => {
          const senders = pc.getSenders();
          const audioSender = senders.find(
            (s) => s.track?.kind === 'audio' || !s.track
          );
          if (audioSender) {
            audioSender.replaceTrack(audioTrack).catch(() => {});
          } else {
            pc.addTrack(audioTrack, stream!);
          }
        });
      }

      this.broadcastState();
      this.notify();
      return true;
    } catch (err: any) {
      console.warn('System audio setup notice:', err);
      return false;
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
    this.isMuted = false;
    this.isDeafened = false;

    // Immediately ask browser for microphone/audio on room entry
    if (typeof navigator !== 'undefined' && Boolean(navigator?.mediaDevices?.getUserMedia)) {
      this.requestSystemPermissions().catch(() => {});
    }

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

            // Track presence
            if (this.channel) {
              await this.channel.track({
                playerId: this.myId,
                name: this.myName,
                isMuted: this.isMuted,
                isDeafened: this.isDeafened,
                isSpeaking: this.isSpeaking,
              });
            }

            // Broadcast join announcement
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

            // Lower ID initiates offer
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
      gain.gain.value = 0.0001;
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

    // 1. Reply with join-ack so the newly joined peer is immediately aware of us!
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

    // 2. The peer with the lower ID initiates the WebRTC offer
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

    // The peer with the lower ID initiates the WebRTC offer
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

    // Initialize pending candidates queue
    if (!this.pendingIceCandidates.has(peerId)) {
      this.pendingIceCandidates.set(peerId, []);
    }

    // Ensure local audio track is attached
    const audioTrack = this.localStream?.getAudioTracks()[0] ?? null;
    if (audioTrack) {
      pc.addTrack(audioTrack, this.localStream!);
    } else {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    }

    // ICE candidates
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

    // Incoming remote audio stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;

      const container = this.getAudioContainer();
      let audioEl = this.remoteAudioElements.get(peerId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.setAttribute('playsinline', 'true');
        audioEl.muted = this.isDeafened;
        container.appendChild(audioEl);
        this.remoteAudioElements.set(peerId, audioEl);
      }

      audioEl.srcObject = remoteStream;
      audioEl.muted = this.isDeafened;
      audioEl.play().catch((err) => {
        console.warn('Remote audio autoplay note:', err);
      });
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      const cState = pc?.connectionState;
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.connectionState = cState;
        this.notify();
      }

      if (cState === 'disconnected' || cState === 'failed') {
        this.cleanupPeer(peerId);
      }
    };

    return pc;
  }

  private async createAndSendOffer(targetPeerId: string) {
    try {
      const pc = await this.getOrCreatePeerConnection(targetPeerId);
      const offer = await pc.createOffer();
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
    }
  }

  private async handleReceiveOffer(payload: { from: string; to: string; offer: RTCSessionDescriptionInit }) {
    if (!payload || payload.to !== this.myId) return;

    try {
      const pc = await this.getOrCreatePeerConnection(payload.from);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

      // Drain any queued ICE candidates that arrived before offer was set
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

    try {
      const pc = this.peerConnections.get(payload.from);
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        // Drain any queued ICE candidates that arrived before answer was set
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
        // Queue candidate until remoteDescription is set
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
   */
  public async toggleMute(): Promise<boolean> {
    if (this.isMuted) {
      if (!this.localStream) {
        await this.requestSystemPermissions();
      }
      this.isMuted = false;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
    } else {
      this.isMuted = true;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      this.isSpeaking = false;
    }

    this.broadcastState();
    this.notify();
    return this.isMuted;
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

    this.remoteAudioElements.forEach((el) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    this.remoteAudioElements.clear();

    this.peers.clear();
    this.isJoined = false;
    this.isMuted = false;
    this.isSpeaking = false;
    this.roomId = null;
    this.myId = null;
    this.channel = null;

    this.notify();
  }
}

export const voiceChat = new VoiceChatManager();
