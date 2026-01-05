export interface Signal {
    type: 'offer' | 'answer' | 'candidate';
    sdp?: string;
    candidate?: RTCIceCandidateInit;
    timestamp: number;
}

export function initMesh(
    myId: string,
    onSignal: (targetId: string, signal: Signal) => void,
    onMessage: (fromId: string, msg: any) => void,
    onPeerDisconnect: (fromId: string) => void
) {
    const peers = new Map<string, { pc: RTCPeerConnection; dc?: RTCDataChannel; candidateQueue: RTCIceCandidateInit[]; makingOffer: boolean; ignoreOffer: boolean }>();

    const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ];

    const createPeer = (targetId: string) => {
        if (peers.has(targetId)) return peers.get(targetId)!;

        const polite = myId < targetId;
        const pc = new RTCPeerConnection({ iceServers });
        let dc: RTCDataChannel | undefined;
        let makingOffer = false;
        let ignoreOffer = false;

        const entry = { pc, dc, candidateQueue: [] as RTCIceCandidateInit[], makingOffer: false, ignoreOffer: false };
        peers.set(targetId, entry);

        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                onSignal(targetId, {
                    type: 'candidate',
                    candidate: candidate.toJSON(),
                    timestamp: Date.now(),
                });
            }
        };
        pc.oniceconnectionstatechange = () => {
            console.log(`[${targetId}] ICE State: ${pc.iceConnectionState}`);
        };
        pc.onicegatheringstatechange = () => {
            console.log(`[${targetId}] ICE Gathering: ${pc.iceGatheringState}`);
        };
        pc.onsignalingstatechange = () => {
            console.log(`[${targetId}] Signaling State: ${pc.signalingState}`);
        };

        pc.ondatachannel = (event) => {
            const channel = event.channel;
            setupDataChannel(channel, targetId, entry);
        };

        pc.onnegotiationneeded = async () => {
            try {
                entry.makingOffer = true;
                // Use implicit createOffer by calling setLocalDescription() without args
                await pc.setLocalDescription();
                onSignal(targetId, {
                    type: 'offer',
                    sdp: pc.localDescription!.sdp,
                    timestamp: Date.now(),
                });
            } catch (err) {
                console.error(`[${targetId}] Negotiation error:`, err);
            } finally {
                entry.makingOffer = false;
            }
        };

        return entry;
    };

    const setupDataChannel = (
        channel: RTCDataChannel,
        targetId: string,
        entry: { pc: RTCPeerConnection; dc?: RTCDataChannel }
    ) => {
        entry.dc = channel;
        console.log(`[${targetId}] Setting up DataChannel: label=${channel.label}, id=${channel.id}, state=${channel.readyState}`);

        channel.onmessage = (event) => {
            console.log(`[${targetId}] Received message:`, event.data);
            try {
                const msg = JSON.parse(event.data);
                onMessage(targetId, msg);
            } catch (e) {
                console.error(`[${targetId}] Failed to parse message`, e);
            }
        };
        channel.onopen = () => {
            console.log(`[${targetId}] DataChannel OPEN`);
        };
        channel.onclose = () => {
            console.log(`[${targetId}] DataChannel CLOSED`);
            onPeerDisconnect(targetId);
        };
        channel.onerror = (err) => {
            console.error(`[${targetId}] DataChannel ERROR`, err);
        };
    };

    const flushCandidateQueue = async (pc: RTCPeerConnection, queue: RTCIceCandidateInit[]) => {
        while (queue.length > 0) {
            const candidate = queue.shift();
            if (candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        }
    };

    return {
        connectTo: (targetId: string) => {
            if (peers.has(targetId)) return;
            console.log(`[RTC] Connecting to ${targetId}`);
            const entry = createPeer(targetId);

            // Only create Data Channel if we are the "impolite" (higher ID) peer.
            // This acts as the Caller. The other side waits for Offer.
            // This prevents Glare and double channels.
            if (myId > targetId) {
                console.log(`[RTC] Creating Data Channel to ${targetId} (Initiator)`);
                const dc = entry.pc.createDataChannel('chat', {
                    ordered: true,
                });
                setupDataChannel(dc, targetId, entry);
            } else {
                console.log(`[RTC] Waiting for connection from ${targetId} (Passive)`);
            }
        },

        handleSignal: async (fromId: string, signal: Signal) => {
            let entry = peers.get(fromId);
            if (!entry) {
                entry = createPeer(fromId);
            }
            const { pc, candidateQueue } = entry;
            const polite = myId < fromId;

            try {
                if (signal.type === 'candidate') {
                    if (signal.candidate) {
                        if (pc.remoteDescription && pc.remoteDescription.type) {
                            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                        } else {
                            candidateQueue.push(signal.candidate);
                        }
                    }
                } else if (signal.type === 'offer') {
                    const offerCollision = (pc.signalingState !== 'stable') || entry.makingOffer;

                    if (offerCollision) {
                        if (!polite) {
                            entry.ignoreOffer = true;
                            console.log(`[${fromId}] Glare detected. I am impolite, ignoring offer.`);
                            return;
                        } else {
                            console.log(`[${fromId}] Glare detected. I am polite, rolling back.`);
                            await pc.setLocalDescription({ type: 'rollback' });
                        }
                    } else {
                        entry.ignoreOffer = false;
                    }

                    await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
                    await pc.setLocalDescription(); // Create answer implicitly

                    await flushCandidateQueue(pc, candidateQueue);

                    onSignal(fromId, {
                        type: 'answer',
                        sdp: pc.localDescription!.sdp,
                        timestamp: Date.now()
                    });
                } else if (signal.type === 'answer') {
                    if (pc.signalingState === 'have-local-offer') {
                        await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
                        await flushCandidateQueue(pc, candidateQueue);
                    }
                }
            } catch (err) {
                console.error(`[${fromId}] Signal error:`, err);
            }
        },

        broadcast: (msg: any) => {
            const json = JSON.stringify(msg);
            let openCount = 0;
            let sentTo: string[] = [];
            peers.forEach((p, id) => {
                if (p.dc && p.dc.readyState === 'open') {
                    p.dc.send(json);
                    openCount++;
                    sentTo.push(id);
                }
            });
            console.log(`[RTC] Broadcast to ${openCount} peers:`, sentTo);
        },

        sendTo: (targetId: string, msg: any) => {
            const p = peers.get(targetId);
            if (p && p.dc && p.dc.readyState === 'open') {
                p.dc.send(JSON.stringify(msg));
            } else {
                console.warn(`[RTC] Cannot send to ${targetId}, channel not open`);
            }
        },

        disconnect: () => {
            peers.forEach(({ pc }) => pc.close());
            peers.clear();
        }
    };
}
