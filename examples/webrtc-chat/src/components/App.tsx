import { type Props } from 'defuss'
import { Chat } from './Chat.tsx'
import './App.css'

export interface AppProps extends Props {
  roomId: string;
}

export function App({ roomId: propRoomId }: AppProps) {
  // Client-side override for static support
  let roomId = propRoomId;
  if (!import.meta.env.SSR) {
    const params = new URLSearchParams(window.location.search);
    roomId = params.get("room") || propRoomId || "lobby";
  }

  return (
    <div class="vbox gap-md" style="width: 100%; max-width: 1400px; margin: 0 auto;">
      <h1>WebRTC Chat (Room: {roomId})</h1>
      <p class="dim">Serverless P2P Chat via Firebase signaling</p>
      <Chat roomId={roomId} />
    </div>
  );
}