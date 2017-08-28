import * as proto from "./protocol";
import * as wireEntities from "./wire-entities";

export namespace eventTypes {
  export const CALL_ACTION = "call_action";
  export const CALL_CREATED = "call_created";
  export const CALL_END = "call_end";
  export const CALL_INVITATION = "call_invitation";
  export const CALL_ACTIVE_DEVICE = "call_active_device";
  export const CHAT_REQUEST = "chat_request";
  export const CHAT_RECEIVED = "chat_received";
  export const CHAT_DELIVERED = "chat_delivered";
  export const CHAT_EDITED = "chat_edited";
  export const ERROR = "error";
  export const HEARTBEAT = "heartbeat";
  export const HELLO = "hello";
  export const ROOM_ACTION = "room_action";
  export const ROOM_CREATED = "room_created";
  export const ROOM_INVITATION = "room_invitation";
  export const ROOM_MARK = "room_mark";
  export const ROOM_MEDIA = "room_media";
  export const ROOM_MESSAGE = "room_message";
  export const ROOM_METADATA = "room_metadata";
  export const ROOM_TYPING = "room_typing";
  export const ROOM_START_TYPING = "room_start_typing";
  export const RTC_DESCRIPTION = "rtc_description";
  export const RTC_CANDIDATE = "rtc_candidate";

  export const DISCONNECT = "disconnect";
}

export namespace actionTypes {
  export type JOINED = "joined";
  export const JOINED = "joined";
  export type TRANSFERRED = "transferred";
  export const TRANSFERRED = "transferred";
  export type LEFT = "left";
  export const LEFT = "left";
  export type INVITED = "invited";
  export const INVITED = "invited";
  export type ANSWERED = "answered";
  export const ANSWERED = "answered";
  export type REJECTED = "rejected";
  export const REJECTED = "rejected";
}

// JSON Events:
export interface Event {
  type: proto.Type;
  ref?: proto.Ref;
  id?: proto.ID;
}

export interface CallActionSent extends Event {
  action: proto.CallAction;
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
  archivable: proto.Archivable;
}

export interface ChatReceived extends Event {
  message: wireEntities.Message;
}

export interface ChatRequest extends Event {
  body: string;
  context?: proto.Context;
  room: proto.ID;
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

export interface RoomActionSent extends Event {
  action: proto.RoomAction;
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

export interface RoomMedia extends Event {
  media: wireEntities.Media;
}

export interface RoomMessage extends Event {
  message: wireEntities.Message;
}

export interface RoomMetadata extends Event {
  metadata: proto.Metadata;
}

export interface RoomStartTyping extends Event {
}

export interface RoomTyping extends Event {
  user: proto.ID;
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

// Internal events:
export interface Disconnect extends Event {
  reason: string;
  code: number;
}

// WS API:
export function chatRequest(room: proto.ID, body: string, context?: proto.Context, ref?: proto.Ref): ChatRequest {
  return {
    type: eventTypes.CHAT_REQUEST,
    room,
    body,
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
    user,
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

// Reading & writing:
export function read(bytes: string): Event {
  return JSON.parse(bytes);
}

export function write(event: Event): string {
  return JSON.stringify(event);
}
