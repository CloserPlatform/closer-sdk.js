// Artichoke protocol messages:

export type Type = string;
export type ID = string;
export type Timestamp = number;

export interface Event {
    type: Type;
    id?: ID;
}

export interface Message extends Event {
    body: string;
    sender: ID;
    room: ID;
    timestamp: number;
    delivered?: number;
}

export interface Error extends Event {
    reason: string;
}

// FIXME Remove these:
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
