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

export interface RichEvent extends proto.WireEvent {
}

export interface RichBotUpdated extends RichEvent, proto.WireBotUpdated {
}

export interface RichCallActionSent extends RichEvent, proto.WireCallActionSent {
}

export interface RichCallInvitation extends RichEvent, proto.WireCallInvitation {
  call: BaseCall;
}

export interface RichCallEnd extends RichEvent, proto.WireCallEnd {
}

export interface RichChatDelivered extends RichEvent, proto.WireChatDelivered {
}

export interface RichChatEdited extends RichEvent, proto.WireChatEdited {
}

export interface RichChatReceived extends RichEvent, proto.WireChatReceived {
  message: Message;
}

export interface RichChatRequest extends RichEvent, proto.WireChatRequest {
}

export interface RichError extends RichEvent, proto.WireError {
}

export interface RichServerInfo extends RichEvent, proto.WireServerInfo {
}

export interface RichHeartbeat extends RichServerInfo, proto.WireHeartbeat {
}

export interface RichHello extends RichServerInfo, proto.WireHello {
}

export interface RichMuteAudio extends RichStreamUpdate, proto.WireMuteAudio {
}

export interface RichPauseVideo extends RichStreamUpdate, proto.WirePauseVideo {
}

export interface RichPresenceRequest extends RichEvent, proto.WirePresenceRequest {
}

export interface RichPresenceUpdate extends RichEvent, proto.WirePresenceUpdate {
}

export interface RichRoomActionSent extends RichEvent, proto.WireRoomActionSent {
}

export interface RichRoomInvitation extends RichEvent, proto.WireRoomInvitation {
  room: Room;
}

export interface RichRoomMark extends RichEvent, proto.WireRoomMark {
}

export interface RichRoomMedia extends RichEvent, proto.WireRoomMedia {
  media: Media;
}

export interface RichRoomMessage extends RichEvent, proto.WireRoomMessage {
  message: Message;
}

export interface RichRoomMetadata extends RichEvent, proto.WireRoomMetadata {
}

export interface RichRoomStartTyping extends RichEvent, proto.WireRoomStartTyping {
}

export interface RichRoomTyping extends RichEvent, proto.WireRoomTyping {
}

export interface RichRTCCandidate extends RichEvent, proto.WireRTCCandidate {
}

export interface RichRTCDescription extends RichEvent, proto.WireRTCDescription {
}

export interface RichStreamUpdate extends RichEvent, proto.WireStreamUpdate {
}

export interface RichUnmuteAudio extends RichStreamUpdate, proto.WireUnmuteAudio {
}

export interface RichUnpauseVideo extends RichStreamUpdate, proto.WireUnpauseVideo {
}

export interface RichDisconnect extends RichEvent, proto.WireDisconnect {
}

export namespace richEvents {

  export function upgrade(e: proto.WireEvent, config: ChatConfig, log: Logger,
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
