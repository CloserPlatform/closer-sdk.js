import { ArtichokeAPI } from "../api";
import { Call, createCall } from "../call";
import { ChatConfig } from "../config";
import { EventHandler } from "../events";
import { Logger } from "../logger";
import { createMedia, Media } from "../media";
import { createMessage, Message } from "../message";
import { createRoom, Room } from "../room";
import * as wireEvents from "./wire-events";
import { eventTypes } from "./wire-events";

export interface Event extends wireEvents.WireEvent {
}

export interface BotUpdated extends Event, wireEvents.WireBotUpdated {
}

export interface CallActionSent extends Event, wireEvents.WireCallActionSent {
}

export interface CallInvitation extends Event, wireEvents.WireCallInvitation {
  call: Call;
}

export interface CallEnd extends Event, wireEvents.WireCallEnd {
}

export interface ChatDelivered extends Event, wireEvents.WireChatDelivered {
}

export interface ChatEdited extends Event, wireEvents.WireChatEdited {
}

export interface ChatReceived extends Event, wireEvents.WireChatReceived {
  message: Message;
}

export interface ChatRequest extends Event, wireEvents.WireChatRequest {
}

export interface Error extends Event, wireEvents.WireError {
}

export interface ServerInfo extends Event, wireEvents.WireServerInfo {
}

export interface Heartbeat extends ServerInfo, wireEvents.WireHeartbeat {
}

export interface Hello extends ServerInfo, wireEvents.WireHello {
}

export interface MuteAudio extends StreamUpdate, wireEvents.WireMuteAudio {
}

export interface PauseVideo extends StreamUpdate, wireEvents.WirePauseVideo {
}

export interface PresenceRequest extends Event, wireEvents.WirePresenceRequest {
}

export interface PresenceUpdate extends Event, wireEvents.WirePresenceUpdate {
}

export interface RoomActionSent extends Event, wireEvents.WireRoomActionSent {
}

export interface RoomInvitation extends Event, wireEvents.WireRoomInvitation {
  room: Room;
}

export interface RoomMark extends Event, wireEvents.WireRoomMark {
}

export interface RoomMedia extends Event, wireEvents.WireRoomMedia {
  media: Media;
}

export interface RoomMessage extends Event, wireEvents.WireRoomMessage {
  message: Message;
}

export interface RoomMetadata extends Event, wireEvents.WireRoomMetadata {
}

export interface RoomStartTyping extends Event, wireEvents.WireRoomStartTyping {
}

export interface RoomTyping extends Event, wireEvents.WireRoomTyping {
}

export interface RTCCandidate extends Event, wireEvents.WireRTCCandidate {
}

export interface RTCDescription extends Event, wireEvents.WireRTCDescription {
}

export interface StreamUpdate extends Event, wireEvents.WireStreamUpdate {
}

export interface UnmuteAudio extends StreamUpdate, wireEvents.WireUnmuteAudio {
}

export interface UnpauseVideo extends StreamUpdate, wireEvents.WireUnpauseVideo {
}

export interface Disconnect extends Event, wireEvents.WireDisconnect {
}

export namespace eventUtils {

  export function upgrade(e: wireEvents.WireEvent, config: ChatConfig, log: Logger,
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

  function isCallInvitation(e: wireEvents.WireEvent): e is wireEvents.WireCallInvitation {
    return e.type === eventTypes.CALL_INVITATION;
  }

  function isChatReceived(e: wireEvents.WireEvent): e is wireEvents.WireChatReceived {
    return e.type === eventTypes.CHAT_RECEIVED;
  }

  function isRoomInvitation(e: wireEvents.WireEvent): e is wireEvents.WireRoomInvitation {
    return e.type === eventTypes.ROOM_INVITATION;
  }

  function isRoomMedia(e: wireEvents.WireEvent): e is wireEvents.WireRoomMedia {
    return e.type === eventTypes.ROOM_MEDIA;
  }

  function isRoomMessage(e: wireEvents.WireEvent): e is wireEvents.WireRoomMessage {
    return e.type === eventTypes.ROOM_MESSAGE;
  }
}
