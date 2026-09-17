import { create } from 'zustand';
import { voiceChat, VoicePeerState } from '../lib/voiceChat';

interface VoiceStore {
  isJoined: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  peers: Record<string, VoicePeerState>;
  error: string | null;

  joinVoice: (roomId: string, myId: string, myName: string) => Promise<void>;
  leaveVoice: () => void;
  toggleMic: () => void;
  toggleSpeaker: () => void;
  clearError: () => void;
  reconnectPeer: (peerId: string) => void;
}

export const useVoiceStore = create<VoiceStore>((set) => {
  // Subscribe immediately to voiceChat state changes
  voiceChat.subscribe((snapshot) => {
    set({
      isJoined: snapshot.isJoined,
      isMuted: snapshot.isMuted,
      isDeafened: snapshot.isDeafened,
      isSpeaking: snapshot.isSpeaking,
      peers: snapshot.peers,
      error: snapshot.error,
    });
  });

  return {
    isJoined: false,
    isMuted: true,
    isDeafened: false,
    isSpeaking: false,
    peers: {},
    error: null,

    joinVoice: async (roomId: string, myId: string, myName: string) => {
      await voiceChat.join(roomId, myId, myName);
    },

    leaveVoice: () => {
      voiceChat.leave();
    },

    toggleMic: async () => {
      await voiceChat.toggleMute();
    },

    toggleSpeaker: () => {
      voiceChat.toggleDeafen();
    },

    clearError: () => {
      voiceChat.clearError();
    },

    reconnectPeer: (peerId: string) => {
      voiceChat.restartPeerConnection(peerId);
    },
  };
});
