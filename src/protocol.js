// Artichoke protocol messages:

export const Call = (sender, recipient, signal, body) => ({
    type: "call",
    sender,
    recipient,
    signal,
    body
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
