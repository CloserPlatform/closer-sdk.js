import {Codec, EventEntity} from "../codec";

export interface MeetmeEvent extends EventEntity {}

export enum MeetmeEventType {
  PRESENCE_UPDATED = "presence_updated",
  TYPING = "room_typing",
  MESSAGE_SENT = "room_message_sent",
  ERROR = "error"
}

export const codec: Codec<MeetmeEvent> = {
  decode: (data: string) => JSON.parse(data),
  encode: (value: MeetmeEvent) => JSON.stringify(value)
};
