import { deepcopy } from "../utils";
import {
  Archivable,
  Bot,
  Call,
  CallAction,
  ID,
  Media,
  Message,
  Metadata,
  Ref,
  Room,
  RoomAction,
  Timestamp,
  Type
} from "./protocol";

export namespace eventTypes {
  export const BOT_UPDATED = "bot_updated";
  export const CALL_ACTION = "call_action";
  export const CALL_END = "call_end";
  export const CALL_INVITATION = "call_invitation";
  export const CHAT_REQUEST = "chat_request";
  export const CHAT_RECEIVED = "chat_received";
  export const CHAT_DELIVERED = "chat_delivered";
  export const CHAT_EDITED = "chat_edited";
  export const ERROR = "error";
  export const HEARTBEAT = "heartbeat";
  export const HELLO = "hello";
  export const PRESENCE_REQUEST = "presence_request";
  export const PRESENCE_UPDATE = "presence_update";
  export const ROOM_ACTION = "room_action";
  export const ROOM_INVITATION = "room_invitation";
  export const ROOM_MARK = "room_mark";
  export const ROOM_MEDIA = "room_media";
  export const ROOM_MESSAGE = "room_message";
  export const ROOM_METADATA = "room_metadata";
  export const ROOM_TYPING = "room_typing";
  export const ROOM_START_TYPING = "room_start_typing";
  export const RTC_DESCRIPTION = "rtc_description";
  export const RTC_CANDIDATE = "rtc_candidate";
  export const STREAM_MUTE = "stream_mute";
  export const STREAM_PAUSE = "stream_pause";
  export const STREAM_UNMUTE = "stream_unmute";
  export const STREAM_UNPAUSE = "stream_unpause";
}

// JSON Events:
export interface WireEvent {
  type: Type;
  ref?: Ref;
  id?: ID;
}

export interface WireBotUpdated extends WireEvent {
  bot: Bot;
}

export interface WireCallActionSent extends WireEvent {
  action: CallAction;
}

export interface WireCallInvitation extends WireEvent {
  call: Call;
  inviter: ID;
}

export interface WireCallEnd extends WireEvent {
  reason: string;
  timestamp: Timestamp;
}

export interface WireChatDelivered extends WireEvent {
  timestamp: Timestamp;
  user?: ID;
}

export interface WireChatEdited extends WireEvent {
  archivable: Archivable;
}

export interface WireChatReceived extends WireEvent {
  message: Message;
}

export interface WireChatRequest extends WireEvent {
  body: string;
  room: ID;
}

export interface WireError extends WireEvent {
  reason: string;
  cause?: any;
}

export interface WireServerInfo extends WireEvent {
  timestamp: Timestamp;
}

export interface WireHeartbeat extends WireServerInfo {
}
export interface WireHello extends WireServerInfo {
}

export interface WireMuteAudio extends WireStreamUpdate {
}
export interface WirePauseVideo extends WireStreamUpdate {
}

export type Status = "away" | "available" | "unavailable";

export interface WirePresenceRequest extends WireEvent {
  status: Status;
}

export interface WirePresenceUpdate extends WireEvent {
  user: ID;
  status: Status;
  timestamp: Timestamp;
}

export interface WireRoomActionSent extends WireEvent {
  action: RoomAction;
}

export interface WireRoomInvitation extends WireEvent {
  inviter: ID;
  room: Room;
}

export interface WireRoomMark extends WireEvent {
  timestamp: Timestamp;
}

export interface WireRoomMedia extends WireEvent {
  media: Media;
}

export interface WireRoomMessage extends WireEvent {
  message: Message;
}

export interface WireRoomMetadata extends WireEvent {
  metadata: Metadata;
}

export interface WireRoomStartTyping extends WireEvent {
}

export interface WireRoomTyping extends WireEvent {
  user: ID;
  timestamp: Timestamp;
}

export type Candidate = RTCIceCandidate;

export interface WireRTCCandidate extends WireEvent {
  peer: ID;
  candidate: Candidate;
}

export type SDP = RTCSessionDescriptionInit;

export interface WireRTCDescription extends WireEvent {
  peer: ID;
  description: SDP;
}

export interface WireStreamUpdate extends WireEvent {
}
export interface WireUnmuteAudio extends WireStreamUpdate {
}
export interface WireUnpauseVideo extends WireStreamUpdate {
}

// Internal events:
export interface WireDisconnect extends WireEvent {
  reason: string;
  code: number;
}

// WS API:
export function chatRequest(room: ID, body: string, ref?: Ref): WireChatRequest {
  return {
    type: eventTypes.CHAT_REQUEST,
    room,
    body,
    ref
  };
}

export function chatDelivered(id: ID, timestamp: Timestamp): WireChatDelivered {
  return {
    type: eventTypes.CHAT_DELIVERED,
    id,
    timestamp
  };
}

export function muteAudio(id: ID): WireMuteAudio {
  return {
    type: eventTypes.STREAM_MUTE,
    id
  };
}

export function unmuteAudio(id: ID): WireUnmuteAudio {
  return {
    type: eventTypes.STREAM_UNMUTE,
    id
  };
}

export function pauseVideo(id: ID): WirePauseVideo {
  return {
    type: eventTypes.STREAM_PAUSE,
    id
  };
}

export function unpauseVideo(id: ID): WireUnpauseVideo {
  return {
    type: eventTypes.STREAM_UNPAUSE,
    id
  };
}

export function mark(id: ID, timestamp: Timestamp): WireRoomMark {
  return {
    type: eventTypes.ROOM_MARK,
    id,
    timestamp
  };
}

export function presenceRequest(status: Status): WirePresenceRequest {
  return {
    type: eventTypes.PRESENCE_REQUEST,
    status
  };
}

export function rtcDescription(id: ID, peer: ID, description: SDP): WireRTCDescription {
  return {
    type: eventTypes.RTC_DESCRIPTION,
    id,
    peer,
    description
  };
}

export function rtcCandidate(id: ID, peer: ID, candidate: Candidate): WireRTCCandidate {
  return {
    type: eventTypes.RTC_CANDIDATE,
    id,
    peer,
    candidate
  };
}

export function startTyping(id: ID): WireRoomStartTyping {
  return {
    type: eventTypes.ROOM_START_TYPING,
    id
  };
}

export function typing(id: ID, user: ID, timestamp: Timestamp): WireRoomTyping {
  return {
    type: eventTypes.ROOM_TYPING,
    id,
    user,
    timestamp
  };
}

// Internal API:
export function error(reason: string, cause?: any, ref?: string): WireError {
  return {
    type: eventTypes.ERROR,
    reason,
    cause,
    ref
  };
}

export function disconnect(code: number, reason: string): WireDisconnect {
  return {
    type: "disconnect",
    reason,
    code
  };
}

// Reading & writing:
export function read(bytes: string): WireEvent {
  return JSON.parse(bytes);
}

export function write(event: WireEvent): string {
  return JSON.stringify(event);
}

// Backend fixer-uppers:
export function fix(e: WireEvent): WireEvent {
  // NOTE Use this function to fix any backend crap.
  switch (e.type) {
    case eventTypes.CALL_END:
      let et = deepcopy(e) as WireCallEnd;
      et.timestamp = Date.now();
      return et;

    case eventTypes.HELLO:
      let h = deepcopy(e) as WireHello;
      h.timestamp = Date.now();
      return h;

    default:
      return e;
  }
}

export function unfix(e: WireEvent): WireEvent {
  // NOTE Use this function to reverse fix(e).
  switch (e.type) {
    case eventTypes.CALL_END:
      let et = deepcopy(e) as WireCallEnd;
      et.timestamp = undefined;
      return et;

    case eventTypes.HELLO:
      let h = deepcopy(e) as WireHello;
      h.timestamp = undefined;
      return h;

    default:
      return e;
  }
}
