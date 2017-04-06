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

export interface BotUpdated extends WireEvent {
  bot: Bot;
}

export interface CallActionSent extends WireEvent {
  action: CallAction;
}

export interface CallInvitation extends WireEvent {
  call: Call;
  inviter: ID;
}

export interface CallEnd extends WireEvent {
  reason: string;
  timestamp: Timestamp;
}

export interface ChatDelivered extends WireEvent {
  timestamp: Timestamp;
  user?: ID;
}

export interface ChatEdited extends WireEvent {
  archivable: Archivable;
}

export interface ChatReceived extends WireEvent {
  message: Message;
}

export interface ChatRequest extends WireEvent {
  body: string;
  room: ID;
}

export interface Error extends WireEvent {
  reason: string;
  cause?: any;
}

export interface ServerInfo extends WireEvent {
  timestamp: Timestamp;
}

export interface Heartbeat extends ServerInfo {
}
export interface Hello extends ServerInfo {
}

export interface MuteAudio extends StreamUpdate {
}
export interface PauseVideo extends StreamUpdate {
}

export type Status = "away" | "available" | "unavailable";

export interface PresenceRequest extends WireEvent {
  status: Status;
}

export interface PresenceUpdate extends WireEvent {
  user: ID;
  status: Status;
  timestamp: Timestamp;
}

export interface RoomActionSent extends WireEvent {
  action: RoomAction;
}

export interface RoomInvitation extends WireEvent {
  inviter: ID;
  room: Room;
}

export interface RoomMark extends WireEvent {
  timestamp: Timestamp;
}

export interface RoomMedia extends WireEvent {
  media: Media;
}

export interface RoomMessage extends WireEvent {
  message: Message;
}

export interface RoomMetadata extends WireEvent {
  metadata: Metadata;
}

export interface RoomStartTyping extends WireEvent {
}

export interface RoomTyping extends WireEvent {
  user: ID;
  timestamp: Timestamp;
}

export type Candidate = RTCIceCandidate;

export interface RTCCandidate extends WireEvent {
  peer: ID;
  candidate: Candidate;
}

export type SDP = RTCSessionDescriptionInit;

export interface RTCDescription extends WireEvent {
  peer: ID;
  description: SDP;
}

export interface StreamUpdate extends WireEvent {
}
export interface UnmuteAudio extends StreamUpdate {
}
export interface UnpauseVideo extends StreamUpdate {
}

// Internal events:
export interface Disconnect extends WireEvent {
  reason: string;
  code: number;
}

// WS API:
export function chatRequest(room: ID, body: string, ref?: Ref): ChatRequest {
  return {
    type: eventTypes.CHAT_REQUEST,
    room,
    body,
    ref
  };
}

export function chatDelivered(id: ID, timestamp: Timestamp): ChatDelivered {
  return {
    type: eventTypes.CHAT_DELIVERED,
    id,
    timestamp
  };
}

export function muteAudio(id: ID): MuteAudio {
  return {
    type: eventTypes.STREAM_MUTE,
    id
  };
}

export function unmuteAudio(id: ID): UnmuteAudio {
  return {
    type: eventTypes.STREAM_UNMUTE,
    id
  };
}

export function pauseVideo(id: ID): PauseVideo {
  return {
    type: eventTypes.STREAM_PAUSE,
    id
  };
}

export function unpauseVideo(id: ID): UnpauseVideo {
  return {
    type: eventTypes.STREAM_UNPAUSE,
    id
  };
}

export function mark(id: ID, timestamp: Timestamp): RoomMark {
  return {
    type: eventTypes.ROOM_MARK,
    id,
    timestamp
  };
}

export function presenceRequest(status: Status): PresenceRequest {
  return {
    type: eventTypes.PRESENCE_REQUEST,
    status
  };
}

export function rtcDescription(id: ID, peer: ID, description: SDP): RTCDescription {
  return {
    type: eventTypes.RTC_DESCRIPTION,
    id,
    peer,
    description
  };
}

export function rtcCandidate(id: ID, peer: ID, candidate: Candidate): RTCCandidate {
  return {
    type: eventTypes.RTC_CANDIDATE,
    id,
    peer,
    candidate
  };
}

export function startTyping(id: ID): RoomStartTyping {
  return {
    type: eventTypes.ROOM_START_TYPING,
    id
  };
}

export function typing(id: ID, user: ID, timestamp: Timestamp): RoomTyping {
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
      let et = deepcopy(e) as CallEnd;
      et.timestamp = Date.now();
      return et;

    case eventTypes.HELLO:
      let h = deepcopy(e) as Hello;
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
      let et = deepcopy(e) as CallEnd;
      et.timestamp = undefined;
      return et;

    case eventTypes.HELLO:
      let h = deepcopy(e) as Hello;
      h.timestamp = undefined;
      return h;

    default:
      return e;
  }
}
