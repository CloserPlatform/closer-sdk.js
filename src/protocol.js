// Artichoke protocol messages:

export const CallCreate = (users) => ({
    type: "call_create",
    users
});

export const CallJoin = (id) => ({
    type: "call_join",
    id
});

export const CallLeave = (id, reason) => ({
    type: "call_leave",
    id,
    reason
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

export const Mark = (room, timestamp) => ({
    type: "mark",
    room,
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

export const RTCDescription = (id, peer, description) => ({
    type: "rtc_description",
    id,
    peer,
    description
});

export const RTCCandidate = (id, peer, candidate) => ({
    type: "rtc_candidate",
    id,
    peer,
    candidate
});

export const Typing = (id) => ({
    type: "typing",
    id
});
