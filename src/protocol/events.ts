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

export interface RichBotUpdated extends Event, proto.WireBotUpdated {
}

export interface RichCallActionSent extends Event, proto.WireCallActionSent {
}

export interface RichCallInvitation extends Event, proto.WireCallInvitation {
  call: BaseCall;
}

export interface RichCallEnd extends Event, proto.WireCallEnd {
}

export interface RichChatDelivered extends Event, proto.WireChatDelivered {
}

export interface RichChatEdited extends Event, proto.WireChatEdited {
}

export interface RichChatReceived extends Event, proto.WireChatReceived {
  message: Message;
}

export interface RichChatRequest extends Event, proto.WireChatRequest {
}

export interface RichError extends Event, proto.WireError {
}

export interface RichServerInfo extends Event, proto.WireServerInfo {
}

export interface RichHeartbeat extends RichServerInfo, proto.WireHeartbeat {
}

export interface RichHello extends RichServerInfo, proto.WireHello {
}

export interface RichMuteAudio extends RichStreamUpdate, proto.WireMuteAudio {
}

export interface RichPauseVideo extends RichStreamUpdate, proto.WirePauseVideo {
}

export interface RichPresenceRequest extends Event, proto.WirePresenceRequest {
}

export interface RichPresenceUpdate extends Event, proto.WirePresenceUpdate {
}

export interface RichRoomActionSent extends Event, proto.WireRoomActionSent {
}

export interface RichRoomInvitation extends Event, proto.WireRoomInvitation {
  room: Room;
}

export interface RichRoomMark extends Event, proto.WireRoomMark {
}

export interface RichRoomMedia extends Event, proto.WireRoomMedia {
  media: Media;
}

export interface RichRoomMessage extends Event, proto.WireRoomMessage {
  message: Message;
}

export interface RichRoomMetadata extends Event, proto.WireRoomMetadata {
}

export interface RichRoomStartTyping extends Event, proto.WireRoomStartTyping {
}

export interface RichRoomTyping extends Event, proto.WireRoomTyping {
}

export interface RichRTCCandidate extends Event, proto.WireRTCCandidate {
}

export interface RichRTCDescription extends Event, proto.WireRTCDescription {
}

export interface RichStreamUpdate extends Event, proto.WireStreamUpdate {
}

export interface RichUnmuteAudio extends RichStreamUpdate, proto.WireUnmuteAudio {
}

export interface RichUnpauseVideo extends RichStreamUpdate, proto.WireUnpauseVideo {
}

export interface RichDisconnect extends Event, proto.WireDisconnect {
}

export namespace richEvents {

  export function upgrade(e: proto.WireEvent, config: ChatConfig, log: Logger,
                          events: EventHandler, api: ArtichokeAPI): Event {
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
