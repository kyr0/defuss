<h1 align="center">
  <br>
  Serverless WebRTC Mesh Chat
</h1>

<p align="center">
  A truly serverless, full-mesh Peer-to-Peer (P2P) live chat system built on free hyperscaler infrastructure.
</p>

## ⚡ Overview

This project demonstrates how to build a resilient, zero-cost communication platform by re-purposing **Firebase Realtime Database** as a passive signaling medium ("Dead Drop") and utilizing **WebRTC Data Channels** for a full-mesh network topology.

Built with **Astro** for the static shell and **[defuss](https://github.com/kyr0/defuss)** for modern, class-less TypeScript components.

## 🏛️ Architecture

*   **Topology**: Full-Mesh (Each peer connects to every other peer).
*   **Signaling**: Passive/Asynchronous via Firebase Realtime Database (Spark Plan).
*   **Transport**: WebRTC Data Channels (SCTP) enabling unordered/ordered reliable delivery.
*   **Presence**: Derived from Firebase `onDisconnect` hooks and client-side heartbeat validation.
*   **Cost**: **$0.00**. Uses only the free tiers of Firebase (Auth + RTDB) and Google STUN servers.

## ✨ Features

*   **Serverless**: No WebSocket servers instances to maintain.
*   **Ephemeral**: Messages live in RAM (nano-stores) and vanish on tab close.
*   **Resilient**: "Perfect Negotiation" pattern handles glare and race conditions.
*   **Self-Cleaning**: Community-based garbage collection removes stale data without server-side logic.
*   **Secure**: Granular Firebase Security Rules ensure authenticated P2P signaling and prevent tampering.

## 🛠️ Setup

### 1. Prerequisites
*   Node.js & `bun`
*   A Google Firebase account

### 2. Installation
```bash
bun install
```

### 3. Firebase Configuration
1.  Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2.  Enable **Authentication** > **Sign-in method** > **Anonymous**.
3.  Enable **Realtime Database** (start in Locked mode).
4.  Copy your config object into `src/lib/firebase.ts`.

### 4. Deploy Rules
Deploy the security rules that allow the P2P magic to happen securely:
```bash
firebase login
firebase init database   # Select your project, accept default file names
firebase deploy --only database
```

### 5. Run Locally
```bash
bun dev
# Open http://localhost:4321/?room=test in two different tabs/browsers
```

## 📜 License

MIT © [Aron Homberg](https://github.com/kyr0)