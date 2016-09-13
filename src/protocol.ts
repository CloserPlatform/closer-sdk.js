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

export interface Message {
    id: ID;
    sender: ID;
    room: ID;
    body: string;
    timestamp: Timestamp;
    delivered?: Timestamp;
}

export interface Room {
    id: ID;
    name: string;
    direct: boolean;
    mark?: number;
}

// JSON Events:
export interface CallInvitation extends Event {
    call: Call;
    inviter: ID;
}

interface CallAction extends Event {
    user: ID;
    timestamp: Timestamp;
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
    inviter: ID;
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
    user: ID;
}

export interface CreateDirectRoom extends CreateDirectEntity {};

export interface CreateRoom {
    name: string;
}

export interface LeaveReason {
    reason: string;
}

export interface Invite {
    user: ID;
}

export function createCall(users: Array<ID>): CreateCall {
    return {
        users
    };
}

export function createDirectCall(user: ID): CreateDirectRoom {
    return {
        user
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

export function createDirectRoom(user: ID): CreateDirectRoom {
    return {
        user
    };
}

export function invite(user): Invite {
    return {
        user
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
export function fix(e: Event): Event {
    // NOTE Use this function to fix any backend crap.
    return e;
}

export function unfix(e: Event): Event {
    // NOTE Use this function to reverse fix(e).
    return e;
}
