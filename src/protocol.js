// Artichoke protocol messages:

export function Call(from, to, signal, payload) {
    return {
        "type": "call",
        "sender": from,
        "recipient": to,
        "signal": signal.toLowerCase(),
        "body": payload
    };
};

export function ChatRequest(room, body) {
    return {
        "type": "msg_request",
        "room": room,
        "body": body
    };
};

export function ChatDelivered(id, timestamp) {
    return {
        "type": "msg_delivered",
        "id": id,
        "timestamp": timestamp
    };
};

export function RoomCreate(name) {
    return {
        "type": "room_create",
        "name": name
    };
}

export function RoomJoin(room) {
    return {
        "type": "room_join",
        "room": room
    };
};

export function RoomLeave(room) {
    return {
        "type": "room_leave",
        "room": room
    };
};

export function RoomInvite(room, user) {
    return {
        "type": "room_invite",
        "room": room,
        "user": user
    };
};

export function RosterAdd(user) {
    return {
        "type": "roster_add",
        "user": user
    };
};

export function RosterRemove(user) {
    return {
        "type": "roster_remove",
        "user": user
    };
};
