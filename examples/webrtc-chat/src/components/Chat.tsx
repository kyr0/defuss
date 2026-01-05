import "./Chat.css";
import { type Props, createRef, $, createStore } from "defuss";
import { initMesh } from "../lib/rtc";
import { db, auth } from "../lib/firebase";
import { ref as dbRef, onValue, set, push, remove, onDisconnect, query, limitToFirst } from "firebase/database";
import { signInAnonymously, signOut } from "firebase/auth";

export interface ChatProps extends Props {
    roomId: string;
}

interface Message {
    id: string;
    senderId: string;
    nick: string;
    text: string;
    timestamp: number;
    type?: 'MSG' | 'NICK' | 'ACTION' | 'PRIVMSG' | 'QUIT';
}

export function Chat({ roomId }: ChatProps) {
    const containerRef = createRef();
    const inputRef = createRef();
    const roomListRef = createRef();
    const userListRef = createRef();

    let chatMesh: any;
    let myId: string;

    let activeMembers: Record<string, { nick: string }> = {};
    const knownNicks = new Map<string, string>();
    const unsubs: (() => void)[] = [];
    let roomsData: Record<string, any> = {};
    let isMod = false;
    let roomMotd = "";
    const roomMods = new Set<string>(); // UIDs of room moderators

    // --- STORES ---
    // 1. User Settings (Global, Persistent)
    const userStore = createStore({ nick: "User_" + Math.floor(Math.random() * 1000) });
    userStore.persist("chat-user", "local");
    // Explicit restore not always needed if persist called immediately, but good for safety
    try { userStore.restore("chat-user", "local"); } catch (e) { }
    let myNick: string = userStore.get("nick");

    // 2. Room History (Session-based, per room)
    const historyStore = createStore<{ messages: Array<Message> }>({ messages: [] });
    const historyKey = `chat-history-${roomId}`;
    historyStore.persist(historyKey, "session");
    try { historyStore.restore(historyKey, "session"); } catch (e) { }

    // Helper Component for Message Rendering
    const MessageItem = ({ msg }: { msg: Message }) => {
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let content;
        let pClass = "message";

        if (msg.type === 'NICK') {
            pClass += " system-message";
            content = <em>{msg.text}</em>;
        } else if (msg.type === 'ACTION') {
            pClass += " action-message";
            content = <em>* {msg.nick} {msg.text}</em>;
        } else if (msg.type === 'PRIVMSG') {
            pClass += " private-message";
            content = (
                <>
                    <strong class="nick">[PM] {msg.nick}:</strong> {msg.text}
                </>
            );
        } else if (msg.type === 'QUIT') {
            pClass += " system-message";
            content = <span style="color: #666; font-style: italic;">&lt;&mdash; {msg.nick} has quit (disconnected by peer)</span>;
        } else if (msg.senderId === 'system') {
            pClass += " system-message";
            content = (
                <>
                    <strong>System:</strong> <pre>{msg.text}</pre>
                </>
            );
        } else {
            // Standard MSG
            content = (
                <>
                    <strong class="nick">{msg.nick}:</strong> {msg.text}
                </>
            );
        }

        return (
            <div className={pClass} data-sender-id={msg.senderId}>
                <span className="timestamp">[{time}]</span> {content}
            </div>
        );
    };

    const updateView = async () => {
        const currentMessages: Array<Message> = historyStore.get("messages") || [];
        console.log("[Chat] updateView. Msgs:", currentMessages.length);

        // Update Messages
        await $(containerRef).update(
            currentMessages.map(m => <MessageItem msg={m} />)
        );

        // Scroll to bottom
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }

        // Update User List
        await $(userListRef).update(
            Object.entries(activeMembers).map(([id, data]) => {
                // Check if this user is a mod (UID prefix matches any mod)
                const uidPrefix = id.split('_')[0]; // Get UID without session suffix
                const isUserMod = roomMods.has(uidPrefix);
                const displayName = data?.nick ? data.nick : id.substring(0, 8);

                return (
                    <li
                        className={`list-item ${id === myId ? 'active' : ''}`}
                        onClick={() => {
                            const input = inputRef.current as HTMLInputElement;
                            if (input) {
                                input.value = `/pm ${data.nick} `;
                                input.focus();
                            }
                        }}
                    >
                        {isUserMod ? '👑 ' : ''}{displayName}
                    </li>
                );
            })
        );

        // Update Room List
        await $(roomListRef).update(
            Object.keys(roomsData).map(r => {
                const count = roomsData[r]?.memberCount || 0;
                return (
                    <li
                        className={`list-item ${r === roomId ? 'active' : ''}`}
                        onClick={() => window.location.href = `/?room=${encodeURIComponent(r)}`}
                    >
                        <span>#{r}</span> <span className="badge">{count}</span>
                    </li>
                );
            })
        );
    };

    // Subscribe to store changes to auto-update view
    historyStore.subscribe(() => updateView());

    const handleMessage = (msg: Message) => {
        console.log("[Chat] handleMessage", msg);

        // Add to Store (Triggering subscriber -> updateView)
        const current: Array<Message> = historyStore.get("messages") || [];
        historyStore.set("messages", [...current, msg]);

        // Side effects for special types
        if (msg.type === 'NICK') {
            if (msg.senderId !== myId) {
                if (activeMembers[msg.senderId]) {
                    activeMembers[msg.senderId].nick = msg.nick;
                }
                knownNicks.set(msg.senderId, msg.nick);
                updateView(); // Force update user list
            } else {
                // My own nick change
                userStore.set("nick", msg.nick);
                myNick = msg.nick;
            }
        }
        else if (msg.type === 'QUIT') {
            if (activeMembers[msg.senderId]) {
                delete activeMembers[msg.senderId];
                updateView(); // Force update user list
            }
        }
    };

    const cleanup = () => {
        console.log("[Chat] Cleaning up listeners...");
        unsubs.forEach(u => u());
        unsubs.length = 0;
        if (chatMesh) {
            chatMesh.disconnect();
            chatMesh = null;
        }
    };

    const resolveNickToId = (nick: string): string | undefined => {
        return Object.entries(activeMembers).find(([_, data]) => data.nick === nick)?.[0];
    };

    const onKeyArgs = (evt: KeyboardEvent) => {
        if (evt.key === 'Enter') {
            const input = evt.target as HTMLInputElement;
            const text = input.value.trim();
            if (!text) return;

            input.value = '';

            // HELP
            if (text === '/help') {
                handleMessage({
                    id: 'sys', senderId: 'system', nick: 'System', timestamp: Date.now(),
                    text: `Available commands:
/nick <name> - Change your nickname
/me <action> - Broadcast an action
/pm <nick> <msg> - Send private message
/join <room> - Switch to room
/sep <nick> - Invite user to private "separee"
/leave - Leave current room
/clear - Clear local history
/debug - Dump debug info

MOD Commands (room creator only):
/motd <msg> - Set room message of the day
/kick <nick> - Kick user from room
/delete - Delete the room`,
                    type: 'MSG'
                });
                return;
            }

            // DEBUG
            if (text === '/debug') {
                console.log("=== CHAT DEBUG ===");
                console.log("My ID:", myId);
                console.log("My Nick:", myNick);
                console.log("Active Members:", activeMembers);
                console.log("Known Nicks:", knownNicks);
                console.log("Room Data:", roomsData);
                console.log("WebRTC Mesh:", chatMesh);
                handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: 'Debug info dumped to console.', timestamp: Date.now() });
                return;
            }

            // JOIN
            if (text.startsWith('/join ')) {
                const roomName = text.substring(6).trim();
                if (roomName) window.location.href = `/?room=${encodeURIComponent(roomName)}`;
                return;
            }

            // LEAVE
            if (text === '/leave') {
                window.location.href = '/';
                return;
            }

            // CLEAR
            if (text === '/clear') {
                historyStore.set("messages", []);
                return;
            }

            // MOTD (MOD only)
            if (text.startsWith('/motd ')) {
                if (!isMod) {
                    handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: 'Only MODs can change MOTD.', timestamp: Date.now() });
                    return;
                }
                const newMotd = text.substring(6).trim();
                set(dbRef(db, `rooms/${roomId}/motd`), newMotd)
                    .then(() => {
                        roomMotd = newMotd;
                        handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: `MOTD set to: ${newMotd}`, timestamp: Date.now() });
                        // Broadcast MOTD to peers
                        if (chatMesh) chatMesh.broadcast({ type: 'MOTD_UPDATE', motd: newMotd });
                    })
                    .catch(e => handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: `Failed to set MOTD: ${e.message}`, timestamp: Date.now() }));
                return;
            }

            // KICK (MOD only)
            if (text.startsWith('/kick ')) {
                if (!isMod) {
                    handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: 'Only MODs can kick users.', timestamp: Date.now() });
                    return;
                }
                const targetNick = text.substring(6).trim();
                const targetId = resolveNickToId(targetNick);
                if (targetId) {
                    remove(dbRef(db, `rooms/${roomId}/members/${targetId}`))
                        .then(() => {
                            handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: `${targetNick} has been kicked.`, timestamp: Date.now() });
                            // Broadcast kick message
                            if (chatMesh) chatMesh.broadcast({ type: 'KICK', targetId, targetNick });
                        })
                        .catch(e => handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: `Failed to kick: ${e.message}`, timestamp: Date.now() }));
                } else {
                    handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: `User '${targetNick}' not found.`, timestamp: Date.now() });
                }
                return;
            }

            // DELETE (MOD only)
            if (text === '/delete') {
                if (!isMod) {
                    handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: 'Only MODs can delete rooms.', timestamp: Date.now() });
                    return;
                }
                if (confirm(`Are you sure you want to delete room '${roomId}'?`)) {
                    remove(dbRef(db, `rooms/${roomId}`))
                        .then(() => {
                            window.location.href = '/';
                        })
                        .catch(e => handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: `Failed to delete room: ${e.message}`, timestamp: Date.now() }));
                }
                return;
            }

            // ME (ACTION)
            if (text.startsWith('/me ')) {
                const actionText = text.substring(4).trim();
                const msg: Message = {
                    id: crypto.randomUUID(),
                    senderId: myId,
                    nick: myNick,
                    text: actionText,
                    timestamp: Date.now(),
                    type: 'ACTION'
                };
                handleMessage(msg);
                if (chatMesh) chatMesh.broadcast(msg);
                return;
            }

            // PM
            if (text.startsWith('/pm ')) {
                const parts = text.split(' ');
                if (parts.length < 3) {
                    handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: 'Usage: /pm <nick> <message>', timestamp: Date.now() });
                    return;
                }
                const targetNick = parts[1];
                const partsMsg = parts.slice(2).join(' ');
                const targetId = resolveNickToId(targetNick);

                if (targetId) {
                    const msg: Message = {
                        id: crypto.randomUUID(),
                        senderId: myId,
                        nick: myNick,
                        text: partsMsg,
                        timestamp: Date.now(),
                        type: 'PRIVMSG'
                    };
                    handleMessage(msg);
                    if (chatMesh) chatMesh.sendTo(targetId, msg);
                } else {
                    handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: `User '${targetNick}' not found.`, timestamp: Date.now() });
                }
                return;
            }

            // SEP
            if (text.startsWith('/sep ')) {
                const targetNick = text.substring(5).trim();
                const targetId = resolveNickToId(targetNick);
                if (targetId) {
                    const array = new Uint8Array(24);
                    crypto.getRandomValues(array);
                    const hash = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

                    const inviteMsg: Message = {
                        id: crypto.randomUUID(),
                        senderId: myId,
                        nick: myNick,
                        text: `I invited you to a private separee. Join -> /?room=${hash}`,
                        timestamp: Date.now(),
                        type: 'PRIVMSG'
                    };
                    if (chatMesh) chatMesh.sendTo(targetId, inviteMsg);

                    handleMessage({
                        id: 'sys', senderId: 'system', nick: 'System',
                        text: `Invited ${targetNick} to separee. Switching in 3s...`,
                        timestamp: Date.now()
                    });

                    setTimeout(() => {
                        window.location.href = `/?room=${hash}`;
                    }, 3000);

                } else {
                    handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: `User '${targetNick}' not found.`, timestamp: Date.now() });
                }
                return;
            }

            // NICK
            if (text.startsWith('/nick ')) {
                const oldNick = myNick;
                const newNick = text.substring(6).trim();
                if (myId) {
                    set(dbRef(db, `rooms/${roomId}/members/${myId}/nick`), newNick);
                    const msg: Message = {
                        id: crypto.randomUUID(),
                        senderId: myId,
                        nick: newNick,
                        text: `${oldNick} is now known as ${newNick}`,
                        timestamp: Date.now(),
                        type: 'NICK'
                    };
                    handleMessage(msg);
                    if (chatMesh) chatMesh.broadcast(msg);
                }
                return;
            }

            // STANDARD MSG
            const msg: Message = {
                id: crypto.randomUUID(),
                senderId: myId,
                nick: myNick,
                text,
                timestamp: Date.now(),
                type: 'MSG'
            };
            handleMessage(msg);
            if (chatMesh) chatMesh.broadcast(msg);
            return;
        }
    };

    // Initialize with $
    $(async () => {
        // Ensure we are in the browser
        if (import.meta.env.SSR) return;

        cleanup();

        try {
            console.log("Initializing Chat...");
            console.time("[Chat] Total Init");
            console.time("[Chat] Auth");
            activeMembers = {};

            // Render initial state from store immediately
            updateView();

            // Authentication: Reuse existing or sign in anonymously
            let user = auth.currentUser;
            if (!user) {
                console.log("[Chat] No active session, signing in...");
                const userCred = await signInAnonymously(auth);
                user = userCred.user;
            } else {
                console.log("[Chat] Reusing existing session:", user.uid);
            }
            // Use UID + Session suffix to allow multiple tabs (P2P requires unique IDs)
            const sessionSuffix = Math.floor(Math.random() * 10000).toString();
            myId = `${user.uid}_${sessionSuffix}`;
            console.timeEnd("[Chat] Auth");
            console.log(`[Chat] Peer ID: ${myId} (Auth: ${user.uid}) in Room ${roomId}`);

            // Presence
            const membersRef = dbRef(db, `rooms/${roomId}/members/${myId}`);
            await set(membersRef, {
                nick: myNick,
                lastSeen: Date.now()
            });
            onDisconnect(membersRef).remove();

            // Try to register as MOD (only succeeds if we're first - rule checks !data.exists())
            const authUid = user.uid;
            try {
                await set(dbRef(db, `rooms/${roomId}/mods/${authUid}`), true);
                isMod = true;
                console.log("[Chat] Registered as room MOD");
            } catch (e) {
                // Not first joiner, so not MOD
                isMod = false;
                console.log("[Chat] Not a MOD (room already has one)");
            }

            // Fetch and listen to MOTD
            const motdListener = onValue(dbRef(db, `rooms/${roomId}/motd`), (snapshot) => {
                roomMotd = snapshot.val() || "";
                // Update MOTD display
                const motdEl = motdRef.current as HTMLElement;
                if (motdEl) motdEl.textContent = roomMotd;
            });
            unsubs.push(motdListener);

            // Listen to mods list
            const modsListener = onValue(dbRef(db, `rooms/${roomId}/mods`), (snapshot) => {
                roomMods.clear();
                const mods = snapshot.val();
                if (mods) {
                    Object.keys(mods).forEach(uid => roomMods.add(uid));
                }
                console.log("[Chat] Room mods:", Array.from(roomMods));
                updateView(); // Refresh user list with crown indicators
            });
            unsubs.push(modsListener);

            // Keepalive (Heartbeat every 30s)
            const liveInterval = setInterval(() => {
                set(dbRef(db, `rooms/${roomId}/members/${myId}/lastSeen`), Date.now());
            }, 30000);
            unsubs.push(() => clearInterval(liveInterval));

            // Init WebRTC
            chatMesh = initMesh(
                myId,
                (targetId, signal) => {
                    const signalRef = dbRef(db, `rooms/${roomId}/signals/${targetId}`);
                    const signalData = { ...signal, from: myId };
                    push(signalRef, signalData)
                        .catch(e => console.error(`[Chat] Signal send failed to ${targetId}`, e));
                },
                (fromId, msg) => {
                    // Handle special broadcast types
                    if (msg.type === 'MOTD_UPDATE' && msg.motd !== undefined) {
                        roomMotd = msg.motd;
                        const motdEl = motdRef.current as HTMLElement;
                        if (motdEl) motdEl.textContent = roomMotd;
                        return;
                    }
                    if (msg.type === 'KICK' && msg.targetId === myId) {
                        handleMessage({ id: 'sys', senderId: 'system', nick: 'System', text: 'You have been kicked from this room.', timestamp: Date.now() });
                        setTimeout(() => window.location.href = '/', 2000);
                        return;
                    }
                    // Normal chat message
                    handleMessage(msg);
                },
                (fromId) => {
                    const nick = knownNicks.get(fromId) || "Unknown User";
                    console.log(`[Chat] Peer disconnected: ${nick} (${fromId})`);
                    handleMessage({
                        id: crypto.randomUUID(),
                        senderId: fromId,
                        nick: nick,
                        text: 'disconnected by peer',
                        timestamp: Date.now(),
                        type: 'QUIT'
                    });
                }
            );

            // Listen for signals
            const mySignalsRef = dbRef(db, `rooms/${roomId}/signals/${myId}`);
            const processedSignals = new Set<string>();

            const unsubSignals = onValue(mySignalsRef, (snapshot) => {
                const signals = snapshot.val();
                if (signals) {
                    // console.log("[Chat] Signals update:", Object.keys(signals).length);
                    Object.entries(signals).forEach(([signalKey, signal]: [string, any]) => {
                        if (!processedSignals.has(signalKey) && signal && signal.from) {
                            console.log(`[Chat] Processing signal ${signalKey} from ${signal.from} (Type: ${signal.type})`);
                            processedSignals.add(signalKey);
                            chatMesh.handleSignal(signal.from, signal);
                            remove(dbRef(db, `rooms/${roomId}/signals/${myId}/${signalKey}`))
                                .catch(e => console.error(`[Chat] Failed to remove signal`, e));
                        }
                    });
                }
            });
            unsubs.push(unsubSignals);

            // Discovery
            const STALE_THRESHOLD = 10 * 60 * 1000; // Remove from DB after 10 mins
            const CONNECT_THRESHOLD = 5 * 60 * 1000; // Only connect if seen in last 5 mins

            const unsubMembers = onValue(dbRef(db, `rooms/${roomId}/members`), (snapshot) => {
                const members = snapshot.val();
                console.log(`[Chat] Members update: ${members ? Object.keys(members).length : 0} members found.`);
                if (members) {
                    activeMembers = members;
                } else {
                    activeMembers = {};
                }
                updateView();

                // Logic for connecting/cleanup
                if (members) {
                    const now = Date.now();
                    Object.entries(members).forEach(([memberId, data]: [string, any]) => {
                        if (data && data.nick) knownNicks.set(memberId, data.nick);

                        // Cleanup ghosts
                        if (data.lastSeen && (now - data.lastSeen) > STALE_THRESHOLD) {
                            // Only remove if it's clearly not us
                            if (memberId !== myId) {
                                remove(dbRef(db, `rooms/${roomId}/members/${memberId}`)).catch(e => console.warn(`[Chat] Failed to remove ghost ${memberId}`, e));
                            }
                        }

                        // Connect only if fresh
                        if (memberId !== myId) {
                            const age = now - (data.lastSeen || 0);
                            const isFresh = data.lastSeen && age < CONNECT_THRESHOLD;
                            if (isFresh) {
                                console.log(`[Chat] Connecting to peer ${memberId} (age: ${Math.round(age / 1000)}s)`);
                                chatMesh.connectTo(memberId);
                            } else {
                                console.log(`[Chat] Skipping stale peer ${memberId} (age: ${Math.round(age / 1000)}s, threshold: ${CONNECT_THRESHOLD / 1000}s)`);
                            }
                        }
                    });
                }
            });
            unsubs.push(unsubMembers);

            // Room List - Shallow REST query (only gets room names, not nested data)
            const DB_URL = "https://webrtc-mesh-chat-default-rtdb.europe-west1.firebasedatabase.app";
            const fetchRoomList = async () => {
                try {
                    console.time("[Chat] Shallow Rooms Fetch");
                    const token = await user.getIdToken();
                    const response = await fetch(`${DB_URL}/rooms.json?shallow=true&auth=${token}`);
                    const roomKeys = await response.json();
                    console.timeEnd("[Chat] Shallow Rooms Fetch");

                    if (roomKeys) {
                        const roomNames = Object.keys(roomKeys);
                        console.log(`[Chat] Rooms loaded: ${roomNames.length}`);

                        // Fetch member counts for each room (shallow)
                        const roomsWithCounts: Record<string, any> = {};
                        await Promise.all(roomNames.map(async (roomName) => {
                            try {
                                const membersRes = await fetch(`${DB_URL}/rooms/${roomName}/members.json?shallow=true&auth=${token}`);
                                const membersKeys = await membersRes.json();
                                const memberCount = membersKeys ? Object.keys(membersKeys).length : 0;
                                roomsWithCounts[roomName] = { memberCount };
                            } catch {
                                roomsWithCounts[roomName] = { memberCount: 0 };
                            }
                        }));

                        roomsData = roomsWithCounts;
                    } else {
                        roomsData = {};
                    }
                    updateView();
                } catch (e) {
                    console.warn("[Chat] Failed to fetch room list:", e);
                }
            };

            // Fetch immediately after auth, don't wait for anything
            fetchRoomList();

            // Refresh room list every 60 seconds
            const roomRefreshInterval = setInterval(fetchRoomList, 60000);
            unsubs.push(() => clearInterval(roomRefreshInterval));

            handleMessage({
                id: 'system',
                senderId: 'system',
                nick: 'System',
                text: `Joined room '${roomId}' as ${myNick}. Type /help for commands.`,
                timestamp: Date.now(),
                type: 'MSG'
            });

        } catch (e) {
            console.error("Initialization failed", e);
        }
    });

    // Sidebar toggle state refs
    const roomListContainerRef = createRef();
    const userListContainerRef = createRef();
    const overlayRef = createRef();

    const toggleSidebar = (side: 'rooms' | 'users') => {
        const roomEl = roomListContainerRef.current as HTMLElement;
        const userEl = userListContainerRef.current as HTMLElement;
        const overlayEl = overlayRef.current as HTMLElement;

        if (side === 'rooms') {
            roomEl?.classList.toggle('open');
            userEl?.classList.remove('open');
        } else {
            userEl?.classList.toggle('open');
            roomEl?.classList.remove('open');
        }

        const anyOpen = roomEl?.classList.contains('open') || userEl?.classList.contains('open');
        overlayEl?.classList.toggle('visible', anyOpen);
    };

    const closeSidebars = () => {
        (roomListContainerRef.current as HTMLElement)?.classList.remove('open');
        (userListContainerRef.current as HTMLElement)?.classList.remove('open');
        (overlayRef.current as HTMLElement)?.classList.remove('visible');
    };

    // MOTD state
    const motdRef = createRef();
    let currentMotd = "";

    return (
        <div class="chat-container">
            <div class="sidebar-overlay" ref={overlayRef} onClick={closeSidebars}></div>

            <div class="room-list" ref={roomListContainerRef}>
                <div class="list-header">#️⃣ Active Rooms</div>
                <ul ref={roomListRef} class="list-content"></ul>
            </div>

            <div class="main-chat">
                <div class="chat-header">
                    <button class="burger-btn" onClick={() => toggleSidebar('rooms')}>☰</button>
                    <span class="room-title">#{roomId}</span>
                    <span class="motd-text" ref={motdRef}></span>
                    <button class="burger-btn" onClick={() => toggleSidebar('users')}>👥</button>
                </div>
                <div class="messages" ref={containerRef}></div>
                <input
                    type="text"
                    class="chat-input"
                    ref={inputRef}
                    onKeyUp={onKeyArgs}
                    placeholder="Type a message... (/help for commands)"
                />
            </div>

            <div class="user-list" ref={userListContainerRef}>
                <div class="list-header">👥 Members</div>
                <ul ref={userListRef} class="list-content"></ul>
            </div>
        </div>
    );
}
