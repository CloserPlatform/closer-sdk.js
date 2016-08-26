// Artichoke protocol messages:

export const CallCreate = (users) => ({
    users
});

export const CallCreateDirect = (peer) => ({
    peer
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

export const LeaveReason = (reason) => ({
    reason
});

export const Mark = (room, timestamp) => ({
    type: "mark",
    room,
    timestamp
});

export const Presence = (sender, status, timestamp) => ({
    type: "presence",
    sender,
    status,
    timestamp
});

export const RoomCreate = (name) => ({
    name
});

export const RoomCreateDirect = (peer) => ({
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
