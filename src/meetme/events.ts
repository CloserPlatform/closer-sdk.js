import { Codec, EventEntity } from "../codec";
import { ID } from "../protocol/protocol";

export interface MeetmeEvent extends EventEntity {
}

export interface PresencedUpdated extends MeetmeEvent {
  user: ID;
  presence: Presence;
  timestamp: number;
}

export enum Presence {
  AVAILABLE = "available",
  AWAY = "away",
  UNAVAILABLE = "unavailable"
}

export interface Typing extends MeetmeEvent {
  room: ID;
  user: ID;
  timestamp: number;
}

export interface MessageSent extends MeetmeEvent {
  room: ID;
  sender: ID;
  timestamp: number;
  body: string;
}

export interface RoomJoined extends MeetmeEvent {
  room: ID;
  user: ID;
  timestamp: number;
}

export interface RoomLeft extends MeetmeEvent {
  room: ID;
  user: ID;
  timestamp: number;
}

export interface Error extends MeetmeEvent {
  reason: string;
}

export enum MeetmeEventType {
  PRESENCE_UPDATED = "presence_updated",
  TYPING = "room_typing",
  MESSAGE_SENT = "room_message_sent",
  ROOM_JOINED = "room_joined",
  ROOM_LEFT = "room_left",
  ERROR = "error"
}

export const codec: Codec<MeetmeEvent> = {
  decode: (data: string) => JSON.parse(data),
  encode: (value: MeetmeEvent) => JSON.stringify(value)
};

export function error(reason: string): Error {
  return {type: MeetmeEventType.ERROR, reason};
}
