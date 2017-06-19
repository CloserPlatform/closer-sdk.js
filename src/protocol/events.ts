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

export interface Event extends wireEvents.Event {
}

export interface CallActionSent extends Event, wireEvents.CallActionSent {
}

export interface CallInvitation extends Event, wireEvents.CallInvitation {
  call: Call;
}

export interface CallActiveDevice extends Event, wireEvents.CallActiveDevice {
}

export interface CallEnd extends Event, wireEvents.CallEnd {
}

export interface ChatDelivered extends Event, wireEvents.ChatDelivered {
}

export interface ChatEdited extends Event, wireEvents.ChatEdited {
}

export interface ChatReceived extends Event, wireEvents.ChatReceived {
  message: Message;
}

export interface ChatRequest extends Event, wireEvents.ChatRequest {
}

export interface Error extends Event, wireEvents.Error {
}

export interface ServerInfo extends Event, wireEvents.ServerInfo {
}

export interface Heartbeat extends ServerInfo, wireEvents.Heartbeat {
}

export interface Hello extends ServerInfo, wireEvents.Hello {
}

export interface MuteAudio extends StreamUpdate, wireEvents.MuteAudio {
}

export interface PauseVideo extends StreamUpdate, wireEvents.PauseVideo {
}

export interface PresenceRequest extends Event, wireEvents.PresenceRequest {
}

export interface PresenceUpdate extends Event, wireEvents.PresenceUpdate {
}

export interface RoomActionSent extends Event, wireEvents.RoomActionSent {
}

export interface RoomInvitation extends Event, wireEvents.RoomInvitation {
  room: Room;
}

export interface RoomMark extends Event, wireEvents.RoomMark {
}

export interface RoomMedia extends Event, wireEvents.RoomMedia {
  media: Media;
}

export interface RoomMessage extends Event, wireEvents.RoomMessage {
  message: Message;
}

export interface RoomMetadata extends Event, wireEvents.RoomMetadata {
}

export interface RoomStartTyping extends Event, wireEvents.RoomStartTyping {
}

export interface RoomTyping extends Event, wireEvents.RoomTyping {
}

export interface RTCCandidate extends Event, wireEvents.RTCCandidate {
}

export interface RTCDescription extends Event, wireEvents.RTCDescription {
}

export interface StreamUpdate extends Event, wireEvents.StreamUpdate {
}

export interface UnmuteAudio extends StreamUpdate, wireEvents.UnmuteAudio {
}

export interface UnpauseVideo extends StreamUpdate, wireEvents.UnpauseVideo {
}

export interface Disconnect extends Event, wireEvents.Disconnect {
}

export namespace eventUtils {

  export function upgrade(e: wireEvents.Event, config: ChatConfig, log: Logger,
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

  function isCallInvitation(e: wireEvents.Event): e is wireEvents.CallInvitation {
    return e.type === eventTypes.CALL_INVITATION;
  }

  function isChatReceived(e: wireEvents.Event): e is wireEvents.ChatReceived {
    return e.type === eventTypes.CHAT_RECEIVED;
  }

  function isRoomInvitation(e: wireEvents.Event): e is wireEvents.RoomInvitation {
    return e.type === eventTypes.ROOM_INVITATION;
  }

  function isRoomMedia(e: wireEvents.Event): e is wireEvents.RoomMedia {
    return e.type === eventTypes.ROOM_MEDIA;
  }

  function isRoomMessage(e: wireEvents.Event): e is wireEvents.RoomMessage {
    return e.type === eventTypes.ROOM_MESSAGE;
  }
}
