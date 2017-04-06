import { ArtichokeAPI } from "../api";
import { BaseCall, createCall } from "../call";
import { ChatConfig } from "../config";
import { EventHandler } from "../events";
import { Logger } from "../logger";
import { createMedia, Media } from "../media";
import { createMessage, Message } from "../message";
import { createRoom, Room } from "../room";
import * as proto from "./wire-events";
import { eventTypes } from "./wire-events";

export interface Event extends proto.WireEvent {
}

export interface BotUpdated extends Event, proto.WireBotUpdated {
}

export interface CallActionSent extends Event, proto.WireCallActionSent {
}

export interface CallInvitation extends Event, proto.WireCallInvitation {
  call: BaseCall;
}

export interface CallEnd extends Event, proto.WireCallEnd {
}

export interface ChatDelivered extends Event, proto.WireChatDelivered {
}

export interface ChatEdited extends Event, proto.WireChatEdited {
}

export interface ChatReceived extends Event, proto.WireChatReceived {
  message: Message;
}

export interface ChatRequest extends Event, proto.WireChatRequest {
}

export interface Error extends Event, proto.WireError {
}

export interface ServerInfo extends Event, proto.WireServerInfo {
}

export interface Heartbeat extends ServerInfo, proto.WireHeartbeat {
}

export interface Hello extends ServerInfo, proto.WireHello {
}

export interface MuteAudio extends StreamUpdate, proto.WireMuteAudio {
}

export interface PauseVideo extends StreamUpdate, proto.WirePauseVideo {
}

export interface PresenceRequest extends Event, proto.WirePresenceRequest {
}

export interface PresenceUpdate extends Event, proto.WirePresenceUpdate {
}

export interface RoomActionSent extends Event, proto.WireRoomActionSent {
}

export interface RoomInvitation extends Event, proto.WireRoomInvitation {
  room: Room;
}

export interface RoomMark extends Event, proto.WireRoomMark {
}

export interface RoomMedia extends Event, proto.WireRoomMedia {
  media: Media;
}

export interface RoomMessage extends Event, proto.WireRoomMessage {
  message: Message;
}

export interface RoomMetadata extends Event, proto.WireRoomMetadata {
}

export interface RoomStartTyping extends Event, proto.WireRoomStartTyping {
}

export interface RoomTyping extends Event, proto.WireRoomTyping {
}

export interface RTCCandidate extends Event, proto.WireRTCCandidate {
}

export interface RTCDescription extends Event, proto.WireRTCDescription {
}

export interface StreamUpdate extends Event, proto.WireStreamUpdate {
}

export interface UnmuteAudio extends StreamUpdate, proto.WireUnmuteAudio {
}

export interface UnpauseVideo extends StreamUpdate, proto.WireUnpauseVideo {
}

export interface RichDisconnect extends Event, proto.WireDisconnect {
}

export namespace richEvents {

  export function upgrade(e: proto.WireEvent, config: ChatConfig, log: Logger,
                          events: EventHandler, api: ArtichokeAPI): Event {
    if (isCallInvitation(e)) {
      const call = createCall(e.call, config.rtc, log, events, api);
      const richEvent: CallInvitation = {...e, call};
      return richEvent;
    }
    if (isChatReceived(e)) {
      const message: Message = createMessage(e.message, log, events, api);
      const richEvent: ChatReceived = {...e, message};
      return richEvent;
    }
    if (isRoomInvitation(e)) {
      const room: Room = createRoom(e.room, log, events, api);
      const richEvent: RoomInvitation = {...e, room};
      return richEvent;
    }
    if (isRoomMedia(e)) {
      const media: Media = createMedia(e.media, log, events, api);
      const richEvent: RoomMedia = {...e, media};
      return richEvent;
    }
    if (isRoomMessage(e)) {
      const message: Message = createMessage(e.message, log, events, api);
      const richEvent: RoomMessage = {...e, message};
      return richEvent;
    }

    const richEvent: Event = {...e};
    return richEvent;
  }

  function isCallInvitation(e: proto.WireEvent): e is proto.WireCallInvitation {
    return e.type === eventTypes.CALL_INVITATION;
  }

  function isChatReceived(e: proto.WireEvent): e is proto.WireChatReceived {
    return e.type === eventTypes.CHAT_RECEIVED;
  }

  function isRoomInvitation(e: proto.WireEvent): e is proto.WireRoomInvitation {
    return e.type === eventTypes.ROOM_INVITATION;
  }

  function isRoomMedia(e: proto.WireEvent): e is proto.WireRoomMedia {
    return e.type === eventTypes.ROOM_MEDIA;
  }

  function isRoomMessage(e: proto.WireEvent): e is proto.WireRoomMessage {
    return e.type === eventTypes.ROOM_MESSAGE;
  }
}
