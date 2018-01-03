import { ArtichokeAPI } from "../api";
import { Call, createCall } from "../call";
import { ChatConfig } from "../config";
import { EventHandler } from "../events";
import { Logger } from "../logger";
import { createMessage, Message } from "../message";
import { createRoom, Room } from "../room";
import * as wireEvents from "./wire-events";
import { eventTypes } from "./wire-events";

export interface Event extends wireEvents.Event {
}

export interface CallMessage extends Event, wireEvents.CallMessage {
  message: Message;
}

export interface CallInvitation extends Event, wireEvents.CallInvitation {
  call: Call;
}

export interface CallActiveDevice extends Event, wireEvents.CallActiveDevice {
}

export interface CallCreated extends Event, wireEvents.CallCreated {
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

export interface ChatSendMessage extends Event, wireEvents.ChatSendMessage {
}

export interface ChatSendCustom extends Event, wireEvents.ChatSendCustom {
}

export interface Error extends Event, wireEvents.Error {
}

export interface ServerInfo extends Event, wireEvents.ServerInfo {
}

export interface Heartbeat extends ServerInfo, wireEvents.Heartbeat {
}

export interface Hello extends ServerInfo, wireEvents.Hello {
}

export interface RoomCreated extends Event, wireEvents.RoomCreated {
  room: Room;
}

export interface RoomInvitation extends Event, wireEvents.RoomInvitation {
  room: Room;
}

export interface RoomMark extends Event, wireEvents.RoomMark {
}

export interface RoomMarked extends Event, wireEvents.RoomMarked {
}

export interface RoomMessage extends Event, wireEvents.RoomMessage {
  message: Message;
}

export interface RoomStartTyping extends Event, wireEvents.RoomStartTyping {
}

export interface RoomTyping extends Event, wireEvents.RoomTyping {
}

export interface RTCCandidate extends Event, wireEvents.RTCCandidate {
}

export interface RTCDescription extends Event, wireEvents.RTCDescription {
}

export interface Disconnect extends Event, wireEvents.Disconnect {
}

export interface ServerUnreachable extends Event, wireEvents.ServerUnreachable {
}

export namespace eventUtils {

  export function upgrade(e: wireEvents.Event, config: ChatConfig, log: Logger,
                          events: EventHandler<Event>, api: ArtichokeAPI): Event {
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
    if (isRoomCreated(e)) {
      const room: Room = createRoom(e.room, log, events, api);
      const richEvent: RoomCreated = {...e, room};
      return richEvent;
    }
    if (isRoomInvitation(e)) {
      const room: Room = createRoom(e.room, log, events, api);
      const richEvent: RoomInvitation = {...e, room};
      return richEvent;
    }
    if (isRoomMessage(e)) {
      const message: Message = createMessage(e.message, log, events, api);
      const richEvent: RoomMessage = {...e, message};
      return richEvent;
    }

    return e;
  }

  function isCallInvitation(e: wireEvents.Event): e is wireEvents.CallInvitation {
    return e.type === eventTypes.CALL_INVITATION;
  }

  function isChatReceived(e: wireEvents.Event): e is wireEvents.ChatReceived {
    return e.type === eventTypes.CHAT_RECEIVED;
  }

  function isRoomCreated(e: wireEvents.Event): e is wireEvents.RoomCreated {
    return e.type === eventTypes.ROOM_CREATED;
  }

  function isRoomInvitation(e: wireEvents.Event): e is wireEvents.RoomInvitation {
    return e.type === eventTypes.ROOM_INVITATION;
  }

  function isRoomMessage(e: wireEvents.Event): e is wireEvents.RoomMessage {
    return e.type === eventTypes.ROOM_MESSAGE;
  }
}
