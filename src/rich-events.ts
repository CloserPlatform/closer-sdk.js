/* tslint:disable no-unused-variable */

import { ArtichokeAPI } from "./api";
import { BaseCall, createCall } from "./call";
import { ChatConfig } from "./config";
import { EventHandler } from "./events";
import { Logger } from "./logger";
import { createMedia, Media } from "./media";
import { createMessage, Message } from "./message";
import * as proto from "./protocol";
import { createRoom, Room } from "./room";

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

export interface RichEvent extends proto.Event {
}

export interface RichBotUpdated extends RichEvent, proto.BotUpdated {
}

export interface RichCallActionSent extends RichEvent, proto.CallActionSent {
}

export interface RichCallInvitation extends RichEvent, proto.CallInvitation {
  call: BaseCall;
}

export interface RichCallEnd extends RichEvent, proto.CallEnd {
}

export interface RichChatDelivered extends RichEvent, proto.ChatDelivered {
}

export interface RichChatEdited extends RichEvent, proto.ChatEdited {
}

export interface RichChatReceived extends RichEvent, proto.ChatReceived {
  message: Message;
}

export interface RichChatRequest extends RichEvent, proto.ChatRequest {
}

export interface RichError extends RichEvent, proto.Error {
}

export interface RichServerInfo extends RichEvent, proto.ServerInfo {
}

export interface RichHeartbeat extends RichServerInfo, proto.Heartbeat {
}

export interface RichHello extends RichServerInfo, proto.Hello {
}

export interface RichMuteAudio extends RichStreamUpdate, proto.MuteAudio {
}

export interface RichPauseVideo extends RichStreamUpdate, proto.PauseVideo {
}

export interface RichPresenceRequest extends RichEvent, proto.PresenceRequest {
}

export interface RichPresenceUpdate extends RichEvent, proto.PresenceUpdate {
}

export interface RichRoomActionSent extends RichEvent, proto.RoomActionSent {
}

export interface RichRoomInvitation extends RichEvent, proto.RoomInvitation {
  room: Room;
}

export interface RichRoomMark extends RichEvent, proto.RoomMark {
}

export interface RichRoomMedia extends RichEvent, proto.RoomMedia {
  media: Media;
}

export interface RichRoomMessage extends RichEvent, proto.RoomMessage {
  message: Message;
}

export interface RichRoomMetadata extends RichEvent, proto.RoomMetadata {
}

export interface RichRoomStartTyping extends RichEvent, proto.RoomStartTyping {
}

export interface RichRoomTyping extends RichEvent, proto.RoomTyping {
}

export interface RichRTCCandidate extends RichEvent, proto.RTCCandidate {
}

export interface RichRTCDescription extends RichEvent, proto.RTCDescription {
}

export interface RichStreamUpdate extends RichEvent, proto.StreamUpdate {
}

export interface RichUnmuteAudio extends RichStreamUpdate, proto.UnmuteAudio {
}

export interface RichUnpauseVideo extends RichStreamUpdate, proto.UnpauseVideo {
}

export interface RichDisconnect extends RichEvent, proto.Disconnect {
}

export namespace richEvents {

  export function upgrade(e: proto.Event, config: ChatConfig, log: Logger,
                          events: EventHandler, api: ArtichokeAPI): RichEvent {
    if (isCallInvitation(e)) {
      const call = createCall(e.call, config.rtc, log, events, api);
      const richEvent: RichCallInvitation = {...e, call};
      return richEvent;
    }
    if (isChatReceived(e)) {
      const message: Message = createMessage(e.message, log, events, api);
      const richEvent: RichChatReceived = {...e, message};
      return richEvent;
    }
    if (isRoomInvitation(e)) {
      const room: Room = createRoom(e.room, log, events, api);
      const richEvent: RichRoomInvitation = {...e, room};
      return richEvent;
    }
    if (isRoomMedia(e)) {
      const media: Media = createMedia(e.media, log, events, api);
      const richEvent: RichRoomMedia = {...e, media};
      return richEvent;
    }
    if (isRoomMessage(e)) {
      const message: Message = createMessage(e.message, log, events, api);
      const richEvent: RichRoomMessage = {...e, message};
      return richEvent;
    }

    const richEvent: RichEvent = {...e};
    return richEvent;
  }

  function isCallInvitation(e: proto.Event): e is proto.CallInvitation {
    return e.type === eventTypes.CALL_INVITATION;
  }

  function isChatReceived(e: proto.Event): e is proto.ChatReceived {
    return e.type === eventTypes.CHAT_RECEIVED;
  }

  function isRoomInvitation(e: proto.Event): e is proto.RoomInvitation {
    return e.type === eventTypes.ROOM_INVITATION;
  }

  function isRoomMedia(e: proto.Event): e is proto.RoomMedia {
    return e.type === eventTypes.ROOM_MEDIA;
  }

  function isRoomMessage(e: proto.Event): e is proto.RoomMessage {
    return e.type === eventTypes.ROOM_MESSAGE;
  }
}
