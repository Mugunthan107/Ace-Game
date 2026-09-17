import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import Landing from './components/Landing/Landing';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard/GameBoard';
import LoadingScreen from './components/common/LoadingScreen';
import ToastHost from './components/common/ToastHost';

export default function App() {
  const view = useGameStore((s) => s.view);
  const room = useGameStore((s) => s.room);
  const tryReconnect = useGameStore((s) => s.tryReconnect);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    tryReconnect().finally(() => setBooting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (booting) return <LoadingScreen label="Reconnecting..." />;

  let content: React.ReactNode;
  if (view === 'landing') content = <Landing />;
  else if (view === 'create') content = <CreateRoom />;
  else if (view === 'join') content = <JoinRoom />;
  else if (view === 'game' && room) {
    content = room.status === 'waiting' ? <WaitingRoom /> : <GameBoard />;
  } else {
    content = <Landing />;
  }

  return (
    <div className="min-h-screen w-full">
      {content}
      <ToastHost />
    </div>
  );
}
