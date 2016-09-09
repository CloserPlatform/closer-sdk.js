// Common types:
export type Type = string;
export type ID = string;
export type Ref = string;
export type Timestamp = number;

// Datatypes:
export interface Call {
    id: ID;
    users: Array<ID>;
    direct: boolean;
}

export interface Room {
    id: ID;
    name: string;
    direct: boolean;
}

export interface RosterRoom extends Room {
    mark?: number;
    unread?: number;
}

// JSON Events:
export interface CallInvitation extends Event {
    call: Call;
    user?: ID;   // FIXME Remove this.
    sender?: ID; // FIXME Should be "inviter"
}

export interface CallInvited extends Event {
    sender: ID; // FIXME Should be "inviter".
    user: ID;
}

export interface CallJoined extends Event {
    user: ID;
}

export interface CallLeft extends Event {
    user: ID;
    reason: string;
}

export interface Event {
    type: Type;
    ref?: Ref;
    id?: ID;
}

export interface Error extends Event {
    reason: string;
}

// FIXME This shouldn't be an event.
export interface Message extends Event {
    body: string;
    sender: ID;
    room: ID;
    timestamp: Timestamp;
    delivered?: Timestamp;
}

export interface MessageDelivered extends Event {
    timestamp: Timestamp;
}

export interface MessageReceived extends Event {
    message: Message;
}

export interface MessageRequest extends Event {
    body: string;
    room: ID;
}

export interface Mark extends Event {
    room: ID;
    timestamp: Timestamp;
}

export type Status = "away" | "available" | "unavailable";

export interface Presence extends Event {
    sender?: ID; // FIXME Remove.
    user?: ID;
    status: Status;
    timestamp: Timestamp;
}

export type Action = "joined" | "left" | "invited";

export interface RoomAction extends Event { // FIXME Remove this.
    originator: ID;
    action: Action;
    subject?: ID;
    timestamp: Timestamp;
}

export interface RoomInvitation extends Event {
    inviter?: ID; // FIXME Make not optional.
    room: Room;
}

interface NewRoomAction extends Event {
    timestamp: Timestamp;
    user: ID;
}

export interface RoomInvited extends NewRoomAction {
    inviter: ID;
}

export interface RoomJoined extends NewRoomAction { }

export interface RoomLeft extends NewRoomAction {
    reason: string;
}

export type Candidate = string;

export interface RTCCandidate extends Event {
    peer: ID;
    candidate: Candidate;
}

export type SDP = RTCSessionDescriptionInit;

export interface RTCDescription extends Event {
    peer: ID;
    description: SDP;
}

export interface Typing extends Event {
    user?: ID;
}

// WS API:
export function messageRequest(room: ID, body: string, ref: Ref): MessageRequest {
    return {
        type: "msg_request",
        room,
        body,
        ref
    };
}

export function messageDelivered(id: ID, timestamp: Timestamp): MessageDelivered {
    return {
        type: "msg_delivered",
        id,
        timestamp
    };
}

export function mark(room: ID, timestamp: Timestamp): Mark {
    return {
        type: "mark",
        room,
        timestamp
    };
}

export function presence(user: ID, status: Status, timestamp: Timestamp): Presence {
    return {
        type: "presence",
        sender: user,
        status,
        timestamp
    };
}

export function rtcDescription(id: ID, peer: ID, description: SDP): RTCDescription {
    return {
        type: "rtc_description",
        id,
        peer,
        description
    };
}

export function rtcCandidate(id: ID, peer: ID, candidate: Candidate): RTCCandidate {
    return {
        type: "rtc_candidate",
        id,
        peer,
        candidate
    };
}

export function typing(id: ID): Typing {
    return {
        type: "typing",
        id
    };
}

// REST API:
export interface CreateCall {
    users: Array<ID>;
}

export interface CreateDirectCall extends CreateDirectEntity {};

export interface CreateDirectEntity {
    peer: ID;
}

export interface CreateDirectRoom extends CreateDirectEntity {};

export interface CreateRoom {
    name: string;
}

export interface LeaveReason {
    reason: string;
}

export function createCall(users: Array<ID>): CreateCall {
    return {
        users
    };
}

export function createDirectCall(peer: ID): CreateDirectRoom {
    return {
        peer
    };
}

export function leaveReason(reason: string): LeaveReason {
    return {
        reason
    };
}

export function createRoom(name: string): CreateRoom {
    return {
        name
    };
}

export function createDirectRoom(peer: ID): CreateDirectRoom {
    return {
        peer
    };
}

// Reading & writing:
export function read(bytes: string): Event {
    return JSON.parse(bytes);
}

export function write(event: Event): string {
    return JSON.stringify(event);
}

// Backend fixer-uppers:
function fixRoomAction(a: RoomAction) {
    switch (a.action) {
    case "invited":
        return {
            type: "room_invited",
            id: a.id,
            inviter: a.originator,
            user: a.subject,
            timestamp: a.timestamp
        } as RoomInvited;

    case "joined":
        return {
            type: "room_joined",
            id: a.id,
            user: a.originator,
            timestamp: a.timestamp
        } as RoomJoined;

    case "left":
        return {
            type: "room_left",
            id: a.id,
            user: a.originator,
            reason: "no reason",
            timestamp: a.timestamp
        } as RoomLeft;

    default:
        throw new Error("Unimplemented RoomAction type: " + a.action);
    }
}

export function fix(e: Event): Event {
    console.log("fix:", e);
    switch (e.type) {
    case "call_invitation":
        let c = e as CallInvitation;
        return {
            type: c.type,
            sender: c.user,
            call: c.call
        } as CallInvitation;

    case "presence":
        let p = e as Presence;
        return {
            type: p.type,
            user: p.sender,
            status: p.status,
            timestamp: p.timestamp,
        } as Presence;

    case "room_created":
        let r = e as RoomInvitation;
        return {
            type: "room_invitation",
            inviter: r.inviter,
            room: r.room
        } as RoomInvitation;

    case "room_action":
        return fixRoomAction(e as RoomAction);

    default:
        return e;
    }
}

export function unfix(e: Event): Event {
    switch (e.type) {
    case "call_invitation":
        let c = e as CallInvitation;
        return {
            type: c.type,
            user: c.sender,
            call: c.call
        } as CallInvitation;

    case "presence":
        let p = e as Presence;
        return {
            type: p.type,
            sender: p.user,
            status: p.status,
            timestamp: p.timestamp,
        } as Presence;

    case "room_invitation":
        let r = e as RoomInvitation;
        return {
            type: "room_created",
            room: r.room
        } as RoomInvitation;

    case "room_invited":
        let ri = e as RoomInvited;
        return {
            type: "room_action",
            id: ri.id,
            action: "invited",
            originator: ri.inviter,
            subject: ri.user,
            timestamp: ri.timestamp
        } as RoomAction;

    case "room_joined":
        let rj = e as RoomJoined;
        return {
            type: "room_action",
            id: rj.id,
            action: "joined",
            originator: rj.user,
            timestamp: rj.timestamp
        } as RoomAction;

    case "room_left":
        let rl = e as RoomLeft;
        return {
            type: "room_action",
            id: rl.id,
            action: "left",
            originator: rl.user,
            timestamp: rl.timestamp
        } as RoomAction;

    default:
        return e;
    }
}
