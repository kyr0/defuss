import "./Chat.css";
import { type Props, createRef, $ } from "defuss";
// import { atom } from "nanostores";
import { initMesh, type Signal } from "../lib/rtc";
import { db, auth } from "../lib/firebase";
import { ref as dbRef, onValue, onChildAdded, set, push, remove, onDisconnect } from "firebase/database";
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
}


export function Chat({ roomId }: ChatProps) {
    const containerRef = createRef();
    const inputRef = createRef();
    let chatMesh: any;
    let myId: string;
    let myNick = "User_" + Math.floor(Math.random() * 1000);

    const renderMessage = (msg: Message) => {
        const div = document.createElement('div');
        div.className = 'message';
        div.innerHTML = `<strong>${msg.nick}:</strong> ${escapeHtml(msg.text)}`;
        return div;
    };

    const escapeHtml = (unsafe: string) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    const handleMessage = (msg: Message) => {
        console.log("[Chat] handleMessage", msg);
        const el = containerRef.current as HTMLElement;
        console.log("[Chat] containerRef.current", el);
        if (el) {
            const div = renderMessage(msg);
            el.appendChild(div);
            el.scrollTop = el.scrollHeight;
        } else {
            console.error("[Chat] Container not found!");
        }
    };

    const init = async () => {
        // Ensure we are in the browser
        if (import.meta.env.SSR) return;
        try {
            console.log("Initializing Chat...");
            await signOut(auth); // Force clean session
            const userCred = await signInAnonymously(auth);
            myId = userCred.user.uid;
            console.log(`[Chat] Signed in as ${myId} in Room ${roomId}`);

            // Presence
            const membersRef = dbRef(db, `rooms/${roomId}/members/${myId}`);
            await set(membersRef, {
                nick: myNick,
                lastSeen: Date.now()
            });
            onDisconnect(membersRef).remove();

            // Keepalive
            setInterval(() => {
                set(dbRef(db, `rooms/${roomId}/members/${myId}/lastSeen`), Date.now());
            }, 60000);

            // Init WebRTC
            chatMesh = initMesh(
                myId,
                (targetId, signal) => {
                    // Use push() for reliable unique key generation
                    const signalRef = dbRef(db, `rooms/${roomId}/signals/${targetId}`);
                    const signalData = { ...signal, from: myId };
                    console.log(`[Chat] Sending signal to ${targetId}:`, signal.type);
                    push(signalRef, signalData)
                        .then(() => console.log(`[Chat] Signal sent to ${targetId}`))
                        .catch(e => console.error(`[Chat] Signal send failed to ${targetId}`, e));
                },
                (fromId, msg) => {
                    handleMessage(msg);
                }
            );

            // Listen for signals using onValue (more reliable than onChildAdded)
            const mySignalsRef = dbRef(db, `rooms/${roomId}/signals/${myId}`);
            const processedSignals = new Set<string>();
            console.log(`[Chat] Setting up signals listener at: rooms/${roomId}/signals/${myId}`);

            onValue(mySignalsRef, (snapshot) => {
                const signals = snapshot.val();
                console.log(`[Chat] Signals snapshot:`, signals ? Object.keys(signals).length + ' signals' : 'empty');
                if (signals) {
                    Object.entries(signals).forEach(([signalKey, signal]: [string, any]) => {
                        if (!processedSignals.has(signalKey) && signal && signal.from) {
                            processedSignals.add(signalKey);
                            console.log(`[Chat] Processing signal from ${signal.from}:`, signal.type, signalKey);
                            chatMesh.handleSignal(signal.from, signal);
                            // Remove after processing
                            remove(dbRef(db, `rooms/${roomId}/signals/${myId}/${signalKey}`))
                                .then(() => console.log(`[Chat] Removed signal ${signalKey}`))
                                .catch(e => console.error(`[Chat] Failed to remove signal`, e));
                        }
                    });
                }
            }, (error) => {
                console.error(`[Chat] Signals listener error:`, error);
            });

            // Discovery + Stale cleanup
            const STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes
            onValue(dbRef(db, `rooms/${roomId}/members`), (snapshot) => {
                const members = snapshot.val();
                console.log(`[Chat] Members list update:`, members ? Object.keys(members) : 'empty');
                if (members) {
                    const now = Date.now();
                    Object.entries(members).forEach(([memberId, data]: [string, any]) => {
                        if (memberId !== myId) {
                            // Try to connect to active peers
                            chatMesh.connectTo(memberId);

                            // Community cleanup: try to delete stale members
                            if (data.lastSeen && (now - data.lastSeen) > STALE_THRESHOLD) {
                                console.log(`[Chat] Attempting to clean up stale member: ${memberId}`);
                                remove(dbRef(db, `rooms/${roomId}/members/${memberId}`))
                                    .then(() => console.log(`[Chat] Cleaned up stale member: ${memberId}`))
                                    .catch(() => { }); // Silently fail if not allowed
                            }
                        }
                    });
                }
            });

            handleMessage({
                id: 'system',
                senderId: 'system',
                nick: 'System',
                text: `Joined as ${myNick}`,
                timestamp: Date.now()
            });

        } catch (e) {
            console.error("Initialization failed", e);
        }
    };

    const onKeyArgs = (evt: KeyboardEvent) => {
        if (evt.key === 'Enter') {
            const input = evt.target as HTMLInputElement;
            const text = input.value.trim();
            if (!text) return;

            input.value = '';

            if (text.startsWith('/nick ')) {
                myNick = text.substring(6);
                if (myId) {
                    set(dbRef(db, `rooms/${roomId}/members/${myId}/nick`), myNick);
                    handleMessage({
                        id: 'system',
                        senderId: 'system',
                        nick: 'System',
                        text: `Nickname changed to ${myNick}`,
                        timestamp: Date.now()
                    });
                }
            } else {
                const msg: Message = {
                    id: crypto.randomUUID(),
                    senderId: myId,
                    nick: myNick,
                    text,
                    timestamp: Date.now()
                };
                handleMessage(msg);
                if (chatMesh) chatMesh.broadcast(msg);
            }
        }
    };

    return (
        <div
            class="chat-container"
            onMount={() => init()}
        >
            <div class="messages" ref={containerRef}></div>
            <input
                type="text"
                class="chat-input"
                ref={inputRef}
                onKeyUp={onKeyArgs}
                placeholder="Type a message... (/nick to change name)"
            />
        </div>
    );
}
