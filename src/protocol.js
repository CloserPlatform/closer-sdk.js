// Artichoke protocol messages:

export const CallAnswer = (user, sdp) => ({
    type: "call_answer",
    user,
    sdp
});

export const CallCandidate = (user, candidate) => ({
    type: "call_candidate",
    user,
    candidate
});

export const CallHangup = (user, reason) => ({
    type: "call_hangup",
    user,
    reason
});

export const CallOffer = (user, sdp) => ({
    type: "call_offer",
    user,
    sdp
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
