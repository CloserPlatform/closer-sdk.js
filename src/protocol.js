// Artichoke protocol messages:

export const CallAnswer = (id, sdp) => ({
    type: "call_answer",
    id,
    sdp
});

export const CallCandidate = (id, candidate) => ({
    type: "call_candidate",
    id,
    candidate
});

export const CallCreate = (user) => ({
    type: "call_create",
    user
});

export const CallHangup = (id, reason) => ({
    type: "call_hangup",
    id,
    reason
});

export const CallOffer = (id, sdp) => ({
    type: "call_offer",
    id,
    sdp
});

export const ChatRequest = (room, body, ref) => ({
    type: "msg_request",
    room,
    body,
    ref
});

export const ChatDelivered = (id, timestamp) => ({
    type: "msg_delivered",
    id,
    timestamp
});

export const RoomCreate = (name) => ({
    type: "room_create",
    name
});

export const RoomCreateDirect = (peer) => ({
    type: "room_create_direct",
    peer
});


export const Mark = (room, timestamp) => ({
    type: "mark",
    room,
    timestamp
});
