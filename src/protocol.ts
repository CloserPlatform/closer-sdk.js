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
    inviter: ID;
}

interface CallAction extends Event {
    user: ID;
    timestamp?: Timestamp; // FIXME Shouldn't be optional.
}

export interface CallInvited extends CallAction {
    inviter: ID;
}

export interface CallJoined extends CallAction { }

export interface CallLeft extends CallAction {
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

export interface Message extends Event { // FIXME This shouldn't be an event.
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

export type Status = "away" | "available" | "unavailable";

export interface Presence extends Event {
    user: ID;
    status: Status;
    timestamp: Timestamp;
}

interface RoomAction extends Event {
    timestamp: Timestamp;
    user: ID;
}

export interface RoomInvitation extends Event {
    inviter?: ID; // FIXME Shouldn't be optional.
    room: Room;
}

export interface RoomInvited extends RoomAction {
    inviter: ID;
}

export interface RoomJoined extends RoomAction { }

export interface RoomLeft extends RoomAction {
    reason: string;
}

export interface RoomMark extends Event {
    timestamp: Timestamp;
}

export interface RoomMessage extends Event {
    message: Message;
}

export interface RoomTyping extends Event {
    user?: ID;
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

export function mark(id: ID, timestamp: Timestamp): RoomMark {
    return {
        type: "room_mark",
        id,
        timestamp
    };
}

export function presence(user: ID, status: Status, timestamp: Timestamp): Presence {
    return {
        type: "presence",
        user,
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

export function typing(id: ID, user?: ID): RoomTyping {
    return {
        type: "room_typing",
        id,
        user
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

// Backend fixer-uppers: // FIXME Adjust format on the backend.
export type Action = "joined" | "left" | "invited";

export interface LegacyRoomAction extends Event {
    originator: ID;
    action: Action;
    subject?: ID;
    timestamp: Timestamp;
}

function clone(event: Event): Event {
    return read(write(event));
}

function fixRoomAction(a: LegacyRoomAction): RoomAction {
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
    switch (e.type) {
    case "call_joined":
        let cj = clone(e) as CallJoined;
        cj.timestamp = Date.now();
        return cj;

    case "call_left":
        let cl = clone(e) as CallLeft;
        cl.timestamp = Date.now();
        return cl;

    case "call_invited":
        let ci = clone(e) as CallInvited;
        ci.timestamp = Date.now();
        return ci;

    case "room_created":
        let r = clone(e) as RoomInvitation;
        r.type = "room_invitation";
        r.inviter = "unknown";
        return r;

    case "room_action":
        return fixRoomAction(e as LegacyRoomAction);

    case "message":
        let m = e as Message;
        return {
            type: "room_message",
            id: m.room,
            message: m
        } as RoomMessage;

    default:
        return e;
    }
}

function roomAction(a: RoomAction, originator: ID, action: Action, subject?: ID): LegacyRoomAction {
    let result = {
        type: "room_action",
        id: a.id,
        originator,
        action,
        timestamp: a.timestamp
    } as LegacyRoomAction;

    if (subject) {
        result.subject = subject;
    }

    return result;
}

export function unfix(e: Event): Event {
    switch (e.type) {
    case "call_invited":
        let ci = e as CallInvited;
        delete ci.timestamp;
        return ci;

    case "call_joined":
        let cj = e as CallJoined;
        delete cj.timestamp;
        return cj;

    case "call_left":
        let cl = e as CallLeft;
        delete cl.timestamp;
        return cl;

    case "room_invitation":
        let r = clone(e) as RoomInvitation;
        delete r.inviter;
        r.type = "room_created";
        return r;

    case "room_invited":
        let ri = e as RoomInvited;
        return roomAction(ri, ri.inviter, "invited", ri.user);

    case "room_joined":
        let rj = e as RoomJoined;
        return roomAction(rj, rj.user, "joined");

    case "room_left":
        let rl = e as RoomLeft;
        return roomAction(rl, rl.user, "left");

    case "room_message":
        return (e as RoomMessage).message;

    default:
        return e;
    }
}
