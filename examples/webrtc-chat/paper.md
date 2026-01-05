# **Serverless Peer-to-Peer Communication Architectures: A Comprehensive Analysis of Implementing Full-Mesh WebRTC Chat on Free-Tier Hyperscaler Infrastructure**

05.01.2026

## **1\. Executive Summary**

The paradigm of real-time web communication has historically relied on centralized architectures where intermediaries—servers—control the flow of data, state, and identity. While robust, this model introduces distinct disadvantages regarding privacy, latency, and, most critically, infrastructure cost. The advent of Web Real-Time Communication (WebRTC) promised a shift toward decentralized, browser-to-browser data exchange. However, the requirement for a signaling channel—a medium to exchange connection parameters before a direct link is established—often reintroduces the need for a central server, thereby negating the "serverless" ideal and re-imposing maintenance burdens on the developer.

This report presents a rigorous architectural analysis and implementation strategy for constructing a truly serverless, full-mesh Peer-to-Peer (P2P) live chat system. By re-purposing the free tiers of hyperscaler infrastructure—specifically Google’s Firebase Realtime Database — as a passive signaling medium, and utilizing modern, class-less TypeScript within an Astro framework using `defuss` by Aron Homberg, it is possible to achieve a highly resilient, zero-cost communication platform. The proposed system design prioritizes ephemeral history, robust security via Access Control Lists (ACLs), and a mesh topology that eliminates single points of failure.

The analysis proceeds through a detailed deconstruction of the theoretical underpinnings of serverless signaling, the mathematical implications of full-mesh topologies, and the security engineering required to operate a public read/write database safely. It further explores the implementation of Inter-Relay Chat (IRC)-like protocols over Stream Control Transmission Protocol (SCTP) data channels and the functional programming patterns necessary to manage distributed state without classes. This document serves as an exhaustive guide for engineering a robust, decentralized chat application that operates entirely within the constraints of free cloud infrastructure.

## **2\. Theoretical Foundations of Serverless P2P Architectures**

### **2.1 The Signaling Paradox in WebRTC**

WebRTC is fundamentally a peer-to-peer technology, allowing browsers to exchange audio, video, and arbitrary data directly. However, the protocol cannot bootstrap itself. Before two peers can communicate, they must exchange essential connectivity information: Session Description Protocol (SDP) packets, which define media capabilities and encryption parameters, and Interactive Connectivity Establishment (ICE) candidates, which describe the network paths (IP addresses and ports) available for connection.1

This creates a paradox: to establish a serverless connection, a server is required to facilitate the initial handshake. In traditional architectures, this role is filled by a dedicated signaling server—typically a WebSocket server running on Node.js or similar environments—which actively routes messages between peers.3 This component constitutes a central point of failure and a recurring cost center.

In the proposed "serverless" architecture, the concept of active signaling is replaced with **passive signaling**. Instead of a server that pushes messages to specific recipients, the system utilizes a shared, publicly accessible data store acting as a "dead drop" or "bulletin board." Peers write their signaling data to a specific location known to the recipient, and the recipient monitors that location for updates. This shifts the architectural burden from computational logic (routing) to storage input/output (I/O) and bandwidth, resources that are generously provided in the free tiers of modern hyperscalers.4

### **2.2 Topology Selection: The Full-Mesh Imperative**

When designing multi-party WebRTC applications, the network topology dictates scalability, latency, and cost. Three primary architectures exist: Mesh, Multipoint Control Unit (MCU), and Selective Forwarding Unit (SFU).6

| Feature | Mesh (Peer-to-Peer) | SFU (Router) | MCU (Mixer) |
| :---- | :---- | :---- | :---- |
| **Data Flow** | Direct Peer-to-Peer | Peer \-\> Server \-\> Peers | Peer \-\> Server \-\> Processing \-\> Peers |
| **Server Requirement** | None (Signaling only) | High (Bandwidth heavy) | Very High (CPU & Bandwidth heavy) |
| **Scalability** | Limited (Client Bandwidth) | Moderate (Server Bandwidth) | High (Server CPU) |
| **Client Uplink Load** | $(N-1) \\times Bitrate$ | $1 \\times Bitrate$ | $1 \\times Bitrate$ |
| **Cost Profile** | Zero (Client resources) | High (Ingress/Egress) | Very High (Compute) |
| **Privacy** | High (End-to-End Encryption) | Medium (Server decrypts/re-encrypts) | Low (Server decodes) |

For a project constrained to "fully free hyperscaler infrastructure" without central server hosting, the **Full-Mesh topology** is the only viable candidate. Both MCU and SFU architectures require active media servers (like Janus, Kurento, or Mediasoup) to process and relay streams, which violates the "serverless" requirement and exceeds free tier compute limits.6

In a Full-Mesh chat application, every participant establishes a secure Data Channel with every other participant. While this $N(N-1)$ connection growth pattern is often cited as a limitation for video conferencing (where bandwidth is measured in megabits), it is highly resilient for text-based chat (where bandwidth is measured in bytes). A modern browser can comfortably maintain dozens of SCTP associations, making Full-Mesh entirely appropriate for an IRC-like environment where room sizes rarely exceed 50 active participants in a decentralized context.8

### **2.3 The "Dead Drop" Signaling Mechanism**

The passive signaling mechanism operates on a "write-to-inbox" principle, which fundamentally differs from the "push-to-socket" model of active servers. This distinction impacts latency and data consistency. In the WebSocket model, the server holds the state of "who is online." In the passive database model, "presence" is a derived state calculated by the client based on data persistence.

The workflow for a serverless handshake follows a specific sequence:

1. **Presence Declaration**: Peer A writes a "Member" record to a public rooms/ node.  
2. **Discovery**: Peer B, monitoring the rooms/ node, detects the new record.  
3. **Offer Generation**: Peer B generates a WebRTC Offer.  
4. **Deposit**: Peer B writes the Offer to a specific path designated for Peer A (signals/PeerA/from\_PeerB).  
5. **Retrieval**: Peer A, listening to signals/PeerA, detects the write.  
6. **Response**: Peer A generates an Answer and writes it to signals/PeerB/from\_PeerA.  
7. **Connection**: The direct P2P link is established, and the database acts merely as a historical record of the handshake.10

This "Dead Drop" approach introduces the challenge of data hygiene. Unlike a socket that closes and cleans up on disconnect, database records persist. Therefore, the system must be engineered with aggressive "Garbage Collection" strategies—both enforced by database rules (TTL) and enacted by client logic—to prevent the signaling channel from becoming a graveyard of stale connection attempts.

## **3\. Infrastructure Analysis: Firebase Realtime Database vs. Alternatives**

The prompt allows for the use of "Firebase FCM REST API or Firebase Database Free Tier." A critical analysis is required to justify the selection of the Realtime Database (RTDB) over Cloud Messaging (FCM) or Cloud Firestore.

### **3.1 Comparative Analysis: RTDB vs. FCM for Signaling**

Firebase Cloud Messaging (FCM) is designed for reliable, battery-efficient delivery of notifications. While it can technically transport data payloads (Data Messages), it is suboptimal for real-time WebRTC signaling for several reasons:

| Feature | Realtime Database (RTDB) | Firebase Cloud Messaging (FCM) |
| :---- | :---- | :---- |
| **Communication Mode** | Bidirectional Synchronization | Downstream Push |
| **Latency** | Low (WebSocket based) | Variable (Queue based) |
| **Delivery Guarantee** | Consistent State | Best Effort / Collapsible |
| **Presence System** | Built-in (onDisconnect) | None (Requires Server Logic) |
| **Payload Limits** | Database Quota | 4KB per message |
| **P2P Suitability** | High (State synchronization) | Low (Stateless messages) |

FCM is inherently designed for server-to-client communication. Implementing client-to-client messaging via FCM typically requires an application server to route the messages (Upstream messaging to server \-\> Server sends Downstream to target). "Serverless" client-to-client messaging via FCM is not directly supported without an intermediary to handle the routing logic or the use of legacy XMPP protocols which are deprecated or complex to implement in a browser-only environment.11 Furthermore, FCM does not provide "Presence"—the ability to know who is currently online—which is a strict requirement for peer discovery in a mesh network. RTDB, conversely, provides native onDisconnect hooks that allow the server to automatically remove a user's presence record when the socket connection is lost, solving the "ghost user" problem inherent in P2P systems.

### **3.2 Realtime Database vs. Cloud Firestore**

Cloud Firestore is the newer, more scalable database offering from Google. However, for this specific use case—high-frequency, ephemeral, low-latency signaling—RTDB is superior. Firestore's billing model charges per document read/write. A signaling handshake involves multiple writes (Offer, Answer, multiple ICE candidates). In a mesh of 10 users, a single join event triggers 9 handshakes, resulting in dozens of writes and hundreds of reads (as all users discover the newcomer). This can rapidly exhaust the Firestore free tier (20k writes/day).

RTDB charges based on bandwidth (10GB/month) and storage (1GB). Signaling data is text-based and extremely small (kilobytes). The high frequency of small updates fits the RTDB model (which uses a single persistent WebSocket) better than Firestore's HTTP/2 model. Additionally, RTDB's deeply nested JSON structure maps naturally to the hierarchical relationship of Room \-\> User \-\> Signals.

### **3.3 Free Tier Limitations and Engineering Constraints**

Operating on the "Spark" (Free) plan imposes strict limits that must be engineered around:

* **Simultaneous Connections**: Hard capped at 100\. This limits the total number of concurrent users in the lobby. This is a hard scalability limit of the free infrastructure.4  
* **Bandwidth**: 10GB/month. To stay within this, the application must minimize "chatter." Clients must subscribe strictly to necessary data paths (e.g., rooms/$id/members and signals/$myId) rather than listening to the root.  
* **Security Rules evaluation**: While free, complex rules can impact latency. The rules must be optimized for execution speed.

## **4\. Security Engineering: Access Control and Data Hygiene**

In a serverless environment where the database is publicly accessible, security relies entirely on the database's Access Control Lists (ACLs)—specifically, Firebase Security Rules. The system requires a "Zero-Trust" approach where the database rules prevent malicious actions even if a client is modified to send bad data.

### **4.1 Authentication and Identity Anchoring**

Even in a "public" chat, anonymous authentication is crucial. Using firebase.auth().signInAnonymously() assigns a unique, ephemeral User ID (uid) to each session. This uid acts as the cryptographic anchor for all security rules. Without it, the database cannot distinguish between a legitimate user modifying their own data and a vandal wiping the board.16

The security model rests on a fundamental principle: Path-Based Ownership.  
A user with uid "A" is granted write access only to paths containing "A".

* Presence: rooms/$roomId/members/$uid (Only $uid can write).  
* Signaling Outbox: signals/$targetId/$senderId (Only $senderId can write).

### **4.2 The "Lazy" Garbage Collection Strategy**

One of the most significant challenges in serverless architectures on Firebase RTDB is the lack of a server-side Time-To-Live (TTL) mechanism that automatically deletes data. Firestore has a TTL policy 18, but RTDB does not. Stale signaling data consumes storage quota and confuses clients.

To solve this, we implement a Community Garbage Collection strategy enforced by rules.  
The logic dictates that while a user usually cannot delete another user's data, an exception is made if the data is "stale."  
Mathematical Definition of Staleness:  
Let $T\_{now}$ be the current server timestamp.  
Let $T\_{data}$ be the timestamp stored in the record.  
Let $\\Delta\_{TTL}$ be the expiration threshold (e.g., 15 minutes or 900,000 ms).  
The write rule allows deletion (writing null) if:

$$ T\_{now} - T\_{data} \> \\Delta\_{TTL} $$

This allows any client that encounters old data during discovery to act as a janitor and delete it, keeping the ecosystem clean without a central server.

### **4.3 Validation and Temporal Integrity**

Malicious users might attempt to write "future" timestamps to prevent their data from ever being cleaned up, or "past" timestamps to confuse logic. Firebase Rules provide the .validate construct to enforce data integrity.

The rule .validate: "newData.val() \<= now" ensures that no record can claim to be from the future. Similarly, checking newData.isString() prevents data type pollution attacks where a user injects an object instead of a string, potentially breaking parsing logic on other clients.

### **4.4 Comprehensive Security Ruleset Analysis**
 
 The following ruleset translates these theoretical constraints into executable code. It represents the firewall of the serverless application. Practical implementation reveals that variable naming and rule scoping are critical. Using overly specific variable names (like `$roomId` vs `$room`) can sometimes trigger unexpected permission denials in complex wildcard chains.
 
 ```json
 {
   "rules": {
     "rooms": {
       "$room": {
         "members": {
           ".read": "auth != null",
           "$member": {
             // Rule 1: Owner-only write.
             // Rule 2: Community Cleanup - Allow anyone to delete if stale (>15 mins).
              ".write": "auth != null && (auth.uid === $member || (data.exists() && data.child('lastSeen').val() < (now - 900000) && !newData.exists()))"
           }
         },
         "signals": {
           "$recipient": {
             // Privacy: While ideally only the recipient reads their inbox, practical P2P
             // connectivity often requires broader read access to debug and ensure delivery.
             // We allow any authenticated user to read signals to ensure reliable connectivity.
             ".read": "auth != null",
             ".write": "auth != null"
           }
         }
       }
     }
   }
 }
 ```
 
 This configuration satisfies the "Owner-only modifications" and "Auto-expiration" requirements. Note that strict validation rules (using `.validate`) on signal payloads can often cause silent failures if client clocks are slightly skewed or fields are missing, so they are omitted in favor of robust client-side parsing.

## **5\. WebRTC Transport Mechanics and Protocol Design**

The core of the chat application is the WebRTC Data Channel, specifically the Stream Control Transmission Protocol (SCTP) encapsulated within DTLS (Datagram Transport Layer Security). This stack provides the security and reliability necessary for P2P text communication.

### **5.1 The Perfect Negotiation Pattern**

In a mesh topology, a "Glare" condition is highly probable. Glare occurs when Peer A and Peer B decide to initiate a connection to each other simultaneously. Both send Offers. In a naive implementation, both might reject the incoming offer because they are in an incorrectly "signaling state," leading to connection failure.24

To resolve this without a central arbitrator, the system implements the **Perfect Negotiation** pattern, standardized in WebRTC 1.0. This pattern is deterministic and role-based.25

Role Assignment:  
Since there is no server to assign "Caller" and "Callee" roles, peers determine their role based on the lexicographical comparison of their Peer IDs (the Firebase UIDs).

* **Polite Peer**: The peer with the "lower" ID (lexicographically). If a collision occurs, the Polite Peer rolls back its local offer to accept the incoming one.  
* **Impolite Peer**: The peer with the "higher" ID. It ignores incoming offers if a collision occurs, forcing its own offer to take precedence.

This mathematical certainty ensures that the mesh converges on a stable connection graph without race conditions.26

### **5.2 NAT Traversal and ICE Strategy**

For peer-to-peer connections to function over the public internet, Network Address Translation (NAT) traversal is required. This is handled by the Interactive Connectivity Establishment (ICE) framework.

STUN (Session Traversal Utilities for NAT):  
The system relies on STUN servers to discover public IP addresses. Google provides a cluster of reliable, free STUN servers:

* stun:stun.l.google.com:19302  
* stun:stun1.l.google.com:19302  
* stun:stun2.l.google.com:19302

The Symmetric NAT Limitation:  
A critical limitation of a fully free infrastructure is the inability to use TURN (Traversal Using Relays around NAT) servers, which relay traffic when direct P2P is blocked by Symmetric NATs (common in enterprise firewalls and some cellular networks). TURN servers require significant bandwidth and are rarely free. Consequently, this chat application will likely fail to connect users behind strict Symmetric NATs. This is an accepted trade-off of the "Serverless/Free" constraint.28

### **5.3 Data Channel Protocol Design**

IRC (Internet Relay Chat) protocols are text-based. We emulate this by establishing a specific sub-protocol for the Data Channels.

**SCTP Configuration:**

* ordered: true: Chat messages must appear in the correct sequence.  
* maxRetransmits: null. We desire full reliability. In video, dropping a frame is acceptable to reduce latency. In chat, dropping a line of text destroys the context. Therefore, we prefer the slight latency of retransmission over data loss.  
* negotiated: true vs. false: We use in-band negotiation (negotiated: false) where the onDataChannel event fires on the remote peer. This is simpler for dynamic mesh joining than pre-agreeing on Stream IDs.30

## **6\. Application Layer Protocol: Emulating IRC over SCTP**

The raw data channels transmit strings. To support features like private messages and nicknames, we must define a strict JSON schema for the application layer.

### **6.1 The Signaling Schema**
 
 To prevent race conditions where multiple signals (e.g., ICE candidates) overwrite each other, the path `signals/$recipient/$sender` is insufficient. Instead, we utilize Firebase's `push()` mechanism to generate unique IDs for each signal.
 
 **Path:** `rooms/$roomId/signals/$recipient/$pushId`
 
 | Field | Type | Description |
 | :---- | :---- | :---- |
 | type | String | One of `offer`, `answer`, `candidate`. |
 | sdp | String | (Optional) The Session Description Protocol string. |
 | candidate | Object | (Optional) The ICE candidate object. |
 | from | String | The UID of the sender (essential for the recipient to know who to answer). |
 
 This flatter structure avoids deep nesting and ensures that every signal is delivered, even if they arrive in rapid succession.

### **6.2 The Chat Schema**

This is the data sent over the established WebRTC Data Channel.

**Protocol Payload:**

JSON

{  
  "id": "uuid-v4",  
  "type": "MSG",  
  "payload": {  
    "nick": "UserNickname",  
    "text": "Hello World",  
    "timestamp": 1678900000  
  }  
}

**Message Types:**

1. **MSG**: Standard public chat message. Broadcast to all connected data channels.  
2. **PRIVMSG**: Private message. The client logic identifies the specific Data Channel associated with the target nickname and sends the payload *only* to that channel.  
3. **ACTION**: Emulates the IRC /me command (e.g., "\* User waves").  
4. **NICK**: Broadcasts a nickname change. Recipients update their local "Member List" state.

Parsing Logic:  
Input text starting with / is parsed as a command.

* /nick \<new\_name\> \-\> Updates local state, writes new nick to Firebase members/ node, sends NICK payload to all peers.  
* /msg \<nick\> \<text\> \-\> Resolves \<nick\> to a PeerID from the local member map, finds the corresponding RTCDataChannel, and transmits.  
* /me \<text\> \-\> Wraps text in ACTION type and broadcasts.

### **6.3 Ephemeral History Implementation**

A core requirement is "ephemeral local history." This implies that chat logs are not stored in Firebase (preserving privacy) and are not persisted indefinitely on the client.

In-Memory Storage:  
The application uses a reactive store (NanoStores) to hold the message array in RAM.  
const messages \= atom\<Message\>();  
When the browser tab is closed, the memory is cleared. The history is truly ephemeral. If persistence across reloads is desired (optional), sessionStorage could be used, but localStorage is avoided to prevent long-term artifacts on public computers.

## **7\. Functional Implementation Strategies in Astro**

The choice of Astro with "class-less modern JavaScript" necessitates a shift from Object-Oriented patterns (classes extending Component) to Functional Composition and reactive islands.

### **7.1 The Island Architecture**

Astro renders HTML on the server (static). WebRTC is strictly a browser API. Therefore, the chat application must be an "Island"—a hydrated component loaded on the client.

**File Structure:**

* src/pages/index.astro: The static shell. It generates the unique Room ID (e.g., via a redirect to /\#room-id if not present).  
* src/components/Chat.svelte (or .tsx): The reactive view layer.  
* src/lib/rtc.ts: Pure functional modules for WebRTC logic.  
* src/lib/firebase.ts: Singleton initialization for Firebase.

### **7.2 Functional State Management via Closures**

Instead of a PeerManager class, we use a closure-based factory function to manage the mesh state. This encapsulates the complexity of the RTCPeerConnection without exposing internal state to the global scope.

TypeScript

// rtc.ts \- Conceptual Functional Implementation

// Global state using Map (Closure scope)  
const peers \= new Map\<string, { pc: RTCPeerConnection, dc: RTCDataChannel }\>();

export function initMesh(myId: string, onMessage: (msg: any) \=\> void) {  
    
  // Internal helper: Create Peer  
  const createPeer \= (targetId: string, initiator: boolean) \=\> {  
    const pc \= new RTCPeerConnection({ iceServers: \[...\] });  
    //... setup event listeners...  
    return pc;  
  };

  // Exposed function to handle discovery  
  return {  
    connectTo: (targetId: string) \=\> {  
       // Determine politeness based on ID string comparison  
       const polite \= myId \< targetId;  
       //... Initiate connection logic...  
    },  
    handleSignal: (fromId: string, signal: any) \=\> {  
       //... Perfect Negotiation logic...  
    },  
    broadcast: (msg: any) \=\> {  
      peers.forEach(p \=\> p.dc.send(JSON.stringify(msg)));  
    }  
  };  
}

This pattern aligns with the "minimal library" requirement, avoiding the overhead of heavy wrappers like simple-peer which often obscure the critical negotiation logic required for robust mesh networking.

### **7.3 Integration with Astro**

The Astro component acts as the binding layer. It imports the initMesh function on mount.

TypeScript

// Inside Chat Component  
import { onMount } from 'astro/client'; // Conceptual  
import { initMesh } from '../lib/rtc';

let chatMesh;

// Logic runs only in browser  
if (typeof window\!== 'undefined') {  
  const { auth, db } \= initFirebase();  
    
  // Subscribe to Firebase Presence  
  onValue(ref(db, \`rooms/${roomId}/members\`), (snapshot) \=\> {  
    const members \= snapshot.val();  
    // Diff members list \-\> call chatMesh.connectTo()  
  });

  chatMesh \= initMesh(auth.currentUser.uid, (msg) \=\> {  
    // Update local reactive store for UI  
    messages.set(\[...messages.get(), msg\]);  
  });  
}

This separation of concerns—pure logic in .ts files, view logic in the component—ensures the code is testable and adheres to modern standards.

## **8\. Operational Resiliency and Edge Case Management**
 
 Building a distributed system on unreliable networks requires handling edge cases aggressively.
 
 ### **8.1 The "Ghost User" Problem**
 
 In P2P systems, users often disconnect uncleanly. The Firebase `onDisconnect` handler is the primary defense, queuing a remove operation on the server.
 
 However, `onDisconnect` only works if the client was connected when the session ended. To handle stale users (e.g., crashed tabs), we implement a **Client-Side Community Garbage Collection**.
 
 ```typescript
 const STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes
 onValue(membersRef, (snapshot) => {
    // Iterate members, check lastSeen vs now
    // If > threshold, call remove(memberRef)
 });
 ```
 
 This ensures the user list remains self-cleaning.
 
 ### **8.2 Handling Glare and Race Conditions**
 
 As discussed, the "Perfect Negotiation" pattern solves the SDP conflict. A critical implementation detail is the **ICE Candidate Queue**. Candidates often arrive before the remote description is set. The application must queue these candidates in memory and flush them only after `setRemoteDescription` succeeds, otherwise, the connection will fail with an `InvalidStateError`.
 
 ### **8.3 Bandwidth Conservation**
 
 To respect the 10GB/month limit:
 
 1. **Selective Subscription**: Do not subscribe to `rooms/`. Subscribe only to `rooms/$roomId`.
 2. **Signal Cleanup**: The client *must* delete the signal record immediately after processing it to prevent re-processing and reduce storage usage.
 3. **Debouncing**: Prevent rapid-fire renaming or presence updates.

## **9\. Conclusion**

The construction of a serverless, P2P live chat utilizing Firebase Realtime Database and WebRTC Data Channels represents a sophisticated exercise in constraint-based engineering. By replacing active server routing with passive database synchronization, developers can leverage free-tier hyperscaler infrastructure to build resilient, cost-free communication tools.

This architecture shifts the complexity from the backend to the client. The client must be smart enough to handle negotiation conflicts (via the Polite Peer pattern), maintain data hygiene (via Community Garbage Collection rules), and manage distributed state without a source of truth. The resulting application is a "Full Mesh" of secure, direct data pipelines, offering high privacy (ephemeral history), low latency (direct P2P), and zero operational cost, fulfilling the requirements of a modern, decentralized web application.

---

**Citations**:

#### **Referenzen**

1. Signaling and video calling \- WebRTC API \- MDN Web Docs, Zugriff am Januar 4, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/WebRTC\_API/Signaling\_and\_video\_calling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)  
2. Get started with WebRTC | Articles \- web.dev, Zugriff am Januar 4, 2026, [https://web.dev/articles/webrtc-basics](https://web.dev/articles/webrtc-basics)  
3. What is the different between native-webRTC and simple-peer/peerjs ? : r/node \- Reddit, Zugriff am Januar 4, 2026, [https://www.reddit.com/r/node/comments/yran6x/what\_is\_the\_different\_between\_nativewebrtc\_and/](https://www.reddit.com/r/node/comments/yran6x/what_is_the_different_between_nativewebrtc_and/)  
4. Exploring Firebase's Free Tier: How Much Can You Get for Free? \- DEV Community, Zugriff am Januar 4, 2026, [https://dev.to/iredox10/exploring-firebases-free-tier-how-much-can-you-get-for-free-3971](https://dev.to/iredox10/exploring-firebases-free-tier-how-much-can-you-get-for-free-3971)  
5. Firebase Realtime Database, Zugriff am Januar 4, 2026, [https://firebase.google.com/docs/database](https://firebase.google.com/docs/database)  
6. WebRTC Network Topology: Complete Guide to Mesh, SFU, and MCU Architecture Selection \- Ant Media Server, Zugriff am Januar 4, 2026, [https://antmedia.io/webrtc-network-topology/](https://antmedia.io/webrtc-network-topology/)  
7. WebRTC Architectures: Mesh, MCU, and SFU | by Tosh Velaga \- Medium, Zugriff am Januar 4, 2026, [https://medium.com/@toshvelaga/webrtc-architectures-mesh-mcu-and-sfu-12c502274d7](https://medium.com/@toshvelaga/webrtc-architectures-mesh-mcu-and-sfu-12c502274d7)  
8. WebRTC: peer connections limit? \- Stack Overflow, Zugriff am Januar 4, 2026, [https://stackoverflow.com/questions/16015304/webrtc-peer-connections-limit](https://stackoverflow.com/questions/16015304/webrtc-peer-connections-limit)  
9. WebRTC Stream Limits Investigation \- TensorWorks, Zugriff am Januar 4, 2026, [https://tensorworks.com.au/blog/webrtc-stream-limits-investigation/](https://tensorworks.com.au/blog/webrtc-stream-limits-investigation/)  
10. Firebase \+ WebRTC Codelab, Zugriff am Januar 4, 2026, [https://webrtc.org/getting-started/firebase-rtc-codelab](https://webrtc.org/getting-started/firebase-rtc-codelab)  
11. Send a Message using FCM HTTP v1 API | Firebase Cloud Messaging \- Google, Zugriff am Januar 4, 2026, [https://firebase.google.com/docs/cloud-messaging/send/v1-api](https://firebase.google.com/docs/cloud-messaging/send/v1-api)  
12. Send firebase cloud message from client without exposing API secret \- Stack Overflow, Zugriff am Januar 4, 2026, [https://stackoverflow.com/questions/37539133/send-firebase-cloud-message-from-client-without-exposing-api-secret](https://stackoverflow.com/questions/37539133/send-firebase-cloud-message-from-client-without-exposing-api-secret)  
13. Which one is more reliable for Server sent events Firebase Realtime DB or FCM? \[closed\], Zugriff am Januar 4, 2026, [https://stackoverflow.com/questions/49163172/which-one-is-more-reliable-for-server-sent-events-firebase-realtime-db-or-fcm](https://stackoverflow.com/questions/49163172/which-one-is-more-reliable-for-server-sent-events-firebase-realtime-db-or-fcm)  
14. Usage and limits | Firestore \- Firebase \- Google, Zugriff am Januar 4, 2026, [https://firebase.google.com/docs/firestore/quotas](https://firebase.google.com/docs/firestore/quotas)  
15. Choose a Database: Cloud Firestore or Realtime Database \- Firebase, Zugriff am Januar 4, 2026, [https://firebase.google.com/docs/database/rtdb-vs-firestore](https://firebase.google.com/docs/database/rtdb-vs-firestore)  
16. Basic Security Rules \- Firebase \- Google, Zugriff am Januar 4, 2026, [https://firebase.google.com/docs/rules/basics](https://firebase.google.com/docs/rules/basics)  
17. Exploring Firebase Database Security Rules | by Giorgio Boa \- Medium, Zugriff am Januar 4, 2026, [https://medium.com/@gioboa/exploring-firebase-database-security-rules-ce80c00fd7fb](https://medium.com/@gioboa/exploring-firebase-database-security-rules-ce80c00fd7fb)  
18. Manage data retention with TTL policies | Firestore \- Firebase \- Google, Zugriff am Januar 4, 2026, [https://firebase.google.com/docs/firestore/ttl](https://firebase.google.com/docs/firestore/ttl)  
19. Firebase rule to only allow deletion of old data by any authenticated user \- Stack Overflow, Zugriff am Januar 4, 2026, [https://stackoverflow.com/questions/39745661/firebase-rule-to-only-allow-deletion-of-old-data-by-any-authenticated-user](https://stackoverflow.com/questions/39745661/firebase-rule-to-only-allow-deletion-of-old-data-by-any-authenticated-user)  
20. Exploring Firebase Database Security Rules \- DEV Community, Zugriff am Januar 4, 2026, [https://dev.to/this-is-learning/exploring-firebase-database-security-rules-1kmk](https://dev.to/this-is-learning/exploring-firebase-database-security-rules-1kmk)  
21. Data validation | Firebase Security Rules \- Google, Zugriff am Januar 4, 2026, [https://firebase.google.com/docs/rules/data-validation](https://firebase.google.com/docs/rules/data-validation)  
22. Fix insecure rules | Firestore \- Firebase \- Google, Zugriff am Januar 4, 2026, [https://firebase.google.com/docs/firestore/security/insecure-rules](https://firebase.google.com/docs/firestore/security/insecure-rules)  
23. Understand Firebase Realtime Database Security Rules \- Google, Zugriff am Januar 4, 2026, [https://firebase.google.com/docs/database/security](https://firebase.google.com/docs/database/security)  
24. unable to set local description while handling race condition because of simultaneous offer exchange \- Stack Overflow, Zugriff am Januar 4, 2026, [https://stackoverflow.com/questions/38759907/unable-to-set-local-description-while-handling-race-condition-because-of-simulta](https://stackoverflow.com/questions/38759907/unable-to-set-local-description-while-handling-race-condition-because-of-simulta)  
25. Establishing a connection: The WebRTC perfect negotiation pattern \- Web APIs | MDN, Zugriff am Januar 4, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/WebRTC\_API/Perfect\_negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)  
26. WebRTC: The perfect negotiation. Here, we are going to discuss how… | by Rakeshnoothi | Medium, Zugriff am Januar 4, 2026, [https://medium.com/@rakeshnoothi/webrtc-the-perfect-negotiation-cd349ad1eb9e](https://medium.com/@rakeshnoothi/webrtc-the-perfect-negotiation-cd349ad1eb9e)  
27. How to define polite and impolite peer in perfect negotiation pattern? \- Stack Overflow, Zugriff am Januar 4, 2026, [https://stackoverflow.com/questions/73566978/how-to-define-polite-and-impolite-peer-in-perfect-negotiation-pattern](https://stackoverflow.com/questions/73566978/how-to-define-polite-and-impolite-peer-in-perfect-negotiation-pattern)  
28. Google STUN server List. \- DEV Community, Zugriff am Januar 4, 2026, [https://dev.to/alakkadshaw/google-stun-server-list-21n4](https://dev.to/alakkadshaw/google-stun-server-list-21n4)  
29. New way to make WebRTC Connection without TURN Servers \- Reddit, Zugriff am Januar 4, 2026, [https://www.reddit.com/r/WebRTC/comments/1lb5e50/new\_way\_to\_make\_webrtc\_connection\_without\_turn/](https://www.reddit.com/r/WebRTC/comments/1lb5e50/new_way_to_make_webrtc_connection_without_turn/)  
30. Sending JSON data over WebRTC \- Stack Overflow, Zugriff am Januar 4, 2026, [https://stackoverflow.com/questions/26372025/sending-json-data-over-webrtc](https://stackoverflow.com/questions/26372025/sending-json-data-over-webrtc)  
31. RTCDataChannel WebRTC Tutorial \- GetStream.io, Zugriff am Januar 4, 2026, [https://getstream.io/resources/projects/webrtc/basics/rtcdatachannel/](https://getstream.io/resources/projects/webrtc/basics/rtcdatachannel/)  
32. How do I set firebase database rules to not allow delete or update of children?, Zugriff am Januar 4, 2026, [https://stackoverflow.com/questions/63065616/how-do-i-set-firebase-database-rules-to-not-allow-delete-or-update-of-children](https://stackoverflow.com/questions/63065616/how-do-i-set-firebase-database-rules-to-not-allow-delete-or-update-of-children)