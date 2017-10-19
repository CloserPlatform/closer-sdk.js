import { Codec, EventEntity } from "../codec";
import * as proto from "./protocol";
import * as wireEntities from "./wire-entities";

export namespace eventTypes {
  export const CALL_MESSAGE = "call_message";
  export const CALL_CREATED = "call_created";
  export const CALL_END = "call_end";
  export const CALL_INVITATION = "call_invitation";
  export const CALL_ACTIVE_DEVICE = "call_active_device";
  export const CHAT_RECEIVED = "chat_received";
  export const CHAT_DELIVERED = "chat_delivered";
  export const CHAT_EDITED = "chat_edited";
  export const CHAT_SEND_MESSAGE = "chat_send_message";
  export const CHAT_SEND_CUSTOM = "chat_send_custom";
  export const ERROR = "error";
  export const HEARTBEAT = "heartbeat";
  export const HELLO = "hello";
  export const ROOM_CREATED = "room_created";
  export const ROOM_INVITATION = "room_invitation";
  export const ROOM_MARK = "room_mark";
  export const ROOM_MESSAGE = "room_message";
  export const ROOM_TYPING = "room_typing";
  export const ROOM_START_TYPING = "room_start_typing";
  export const RTC_DESCRIPTION = "rtc_description";
  export const RTC_CANDIDATE = "rtc_candidate";

  export const DISCONNECT = "disconnect";
}

export namespace actionTypes {
  export type OFFLINE = "DEVICE_OFFLINE";
  export const OFFLINE = "DEVICE_OFFLINE";
  export type ONLINE = "DEVICE_ONLINE";
  export const ONLINE = "DEVICE_ONLINE";

  export type TEXT_MESSAGE = "TEXT_MESSAGE";
  export const TEXT_MESSAGE = "TEXT_MESSAGE";

  export type ROOM_JOINED = "ROOM_JOINED";
  export const ROOM_JOINED = "ROOM_JOINED";
  export type ROOM_LEFT = "ROOM_LEFT";
  export const ROOM_LEFT = "ROOM_LEFT";
  export type ROOM_INVITED = "ROOM_INVITED";
  export const ROOM_INVITED = "ROOM_INVITED";

  export type CALL_JOINED = "CALL_JOINED";
  export const CALL_JOINED = "CALL_JOINED";
  export type CALL_LEFT = "CALL_LEFT";
  export const CALL_LEFT = "CALL_LEFT";
  export type CALL_INVITED = "CALL_INVITED";
  export const CALL_INVITED = "CALL_INVITED";
  export type CALL_ANSWERED = "CALL_ANSWERED";
  export const CALL_ANSWERED = "CALL_ANSWERED";
  export type CALL_REJECTED = "CALL_REJECTED";
  export const CALL_REJECTED = "CALL_REJECTED";
  export type CALL_TRANSFERRED = "CALL_TRANSFERRED";
  export const CALL_TRANSFERRED = "CALL_TRANSFERRED";
}

// JSON Events:
export interface Event extends EventEntity {
  ref?: proto.Ref;
}

export interface CallMessage extends Event {
  message: wireEntities.Message;
}

export interface CallInvitation extends Event {
  call: wireEntities.Call;
  inviter: proto.ID;
}

export interface CallActiveDevice extends Event {
  device: proto.ID;
}

export interface CallCreated extends Event {
  call: wireEntities.Call;
}

export interface CallEnd extends Event {
  reason: string;
  timestamp: proto.Timestamp;
}

export interface ChatDelivered extends Event {
  timestamp: proto.Timestamp;
  user?: proto.ID;
}

export interface ChatEdited extends Event {
  message: wireEntities.Message;
}

export interface ChatReceived extends Event {
  message: wireEntities.Message;
}

export interface ChatSendMessage extends Event {
  body: string;
  room: proto.ID;
}

export interface ChatSendCustom extends Event {
  body: string;
  room: proto.ID;
  tag: string;
  context: proto.Context;
}

export interface Error extends Event {
  reason: string;
  cause?: any;
}

export interface ServerInfo extends Event {
  timestamp: proto.Timestamp;
}

export interface Heartbeat extends ServerInfo {
}
export interface Hello extends ServerInfo {
  deviceId: proto.ID;
}

export interface RoomCreated extends Event {
  room: wireEntities.Room;
}

export interface RoomInvitation extends Event {
  inviter: proto.ID;
  room: wireEntities.Room;
}

export interface RoomMark extends Event {
  timestamp: proto.Timestamp;
}

export interface RoomMessage extends Event {
  message: wireEntities.Message;
}

export interface RoomStartTyping extends Event {
}

export interface RoomTyping extends Event {
  userId: proto.ID;
  timestamp: proto.Timestamp;
}

export type Candidate = RTCIceCandidate;

export interface RTCCandidate extends Event {
  peer: proto.ID;
  candidate: Candidate;
}

export type SDP = RTCSessionDescriptionInit;

export interface RTCDescription extends Event {
  peer: proto.ID;
  description: SDP;
}

export interface Invitee {
  invitee: proto.ID;
}

export type EndReason = string;

export interface Reason {
  reason: EndReason;
}

// Internal events:
export interface Disconnect extends Event {
  reason: string;
  code: number;
}

// WS API:
export function chatSendMessage(room: proto.ID, body: string, ref?: proto.Ref): ChatSendMessage {
  return {
    type: eventTypes.CHAT_SEND_MESSAGE,
    room,
    body,
    ref
  };
}

export function chatSendCustom(room: proto.ID, body: string, tag: string,
                               context: proto.Context, ref?: proto.Ref): ChatSendCustom {
  return {
    type: eventTypes.CHAT_SEND_CUSTOM,
    room,
    body,
    tag,
    context,
    ref
  };
}

export function chatDelivered(id: proto.ID, timestamp: proto.Timestamp): ChatDelivered {
  return {
    type: eventTypes.CHAT_DELIVERED,
    id,
    timestamp
  };
}

export function mark(id: proto.ID, timestamp: proto.Timestamp): RoomMark {
  return {
    type: eventTypes.ROOM_MARK,
    id,
    timestamp
  };
}

export function rtcDescription(id: proto.ID, peer: proto.ID, description: SDP): RTCDescription {
  return {
    type: eventTypes.RTC_DESCRIPTION,
    id,
    peer,
    description
  };
}

export function rtcCandidate(id: proto.ID, peer: proto.ID, candidate: Candidate): RTCCandidate {
  return {
    type: eventTypes.RTC_CANDIDATE,
    id,
    peer,
    candidate
  };
}

export function startTyping(id: proto.ID): RoomStartTyping {
  return {
    type: eventTypes.ROOM_START_TYPING,
    id
  };
}

export function typing(id: proto.ID, user: proto.ID, timestamp: proto.Timestamp): RoomTyping {
  return {
    type: eventTypes.ROOM_TYPING,
    id,
    userId: user,
    timestamp
  };
}

// Internal API:
export function error(reason: string, cause?: any, ref?: string): Error {
  return {
    type: eventTypes.ERROR,
    reason,
    cause,
    ref
  };
}

export function disconnect(code: number, reason: string): Disconnect {
  return {
    type: eventTypes.DISCONNECT,
    reason,
    code
  };
}

export function activeDevice(id: proto.ID, device: proto.ID): CallActiveDevice {
  return {
    type: eventTypes.CALL_ACTIVE_DEVICE,
    id,
    device
  };
}

export const codec: Codec<Event> = {
  decode: (data: string) => JSON.parse(data),
  encode: (value: Event) => JSON.stringify(value)
};
