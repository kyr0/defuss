import { type Props } from 'defuss'
import { Chat } from './Chat.tsx'
import './App.css'

export interface AppProps extends Props {
  roomId: string;
}

export function App({ roomId }: AppProps) {
  return (
    <div class="vbox gap-md" style="width: 100%; max-width: 800px; margin: 0 auto;">
      <h1>WebRTC Chat (Room: {roomId})</h1>
      <p class="dim">Serverless P2P Chat via Firebase signaling</p>
      <Chat roomId={roomId} />
    </div>
  );
}