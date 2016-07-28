// Artichoke protocol messages:

export const CallAnswer = (sender, recipient, sdp) => ({
    type: "call",
    sender,
    recipient,
    signal: "answer",
    body: sdp
});

export const CallCandidate = (sender, recipient, candidate) => ({
    type: "call",
    sender,
    recipient,
    signal: "candidate",
    body: candidate
});

export const CallHangup = (sender, recipient, reason) => ({
    type: "call",
    sender,
    recipient,
    signal: "hangup",
    body: reason
});

export const CallOffer = (sender, recipient, sdp) => ({
    type: "call",
    sender,
    recipient,
    signal: "offer",
    body: sdp
});

export const ChatRequest = (room, body) => ({
    type: "msg_request",
    room,
    body
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

export const RosterAdd = (user) => ({
    type: "roster_add",
    user
});

export const RosterRemove = (user) => ({
    type: "roster_remove",
    user
});
