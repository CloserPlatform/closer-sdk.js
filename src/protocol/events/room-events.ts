import { DomainCommand } from "../commands/domain-command";
import { DomainEvent } from "./domain-event";

export namespace roomEvents {
  export enum EndReason {
    Terminated = "terminated",
    Timeout = "timeout",
    Ended = "ended",
    Hangup = "hangup",
    ConnectionDropped = "connection_dropped",
    Disconnected = "disconnected",
    CallRejected = "rejected",
    Busy = "busy",
  }

  export abstract class RoomEvent implements DomainEvent {
    protected constructor(roomId: string, authorId: string, timestamp: number, tag: string) {
      this.roomId = roomId;
      this.authorId = authorId;
      this.timestamp = timestamp;
      this.tag = tag;
    }

    readonly roomId: string;
    readonly authorId: string;
    readonly timestamp: number;
    readonly tag: string;
  }

  export class Created extends RoomEvent {
    static readonly tag = "room_created";

    constructor(roomId: string, authorId: string, timestamp: number) {
      super(roomId, authorId, timestamp, Created.tag);
    }
  }

  export class Invited extends RoomEvent {
    static readonly tag = "room_invited";

    constructor(roomId: string, authorId: string, invitee: string, timestamp: number) {
      super(roomId, authorId, timestamp, Invited.tag);

      this.invitee = invitee;
    }

    readonly invitee: string;
  }

  export class Joined extends RoomEvent {
    static readonly tag = "room_joined";

    constructor(roomId: string, authorId: string, timestamp: number) {
      super(roomId, authorId, timestamp, Joined.tag);
    }
  }

  export class Left extends RoomEvent {
    static readonly tag = "room_left";

    constructor(roomId: string, authorId: string, endReason: EndReason, timestamp: number) {
      super(roomId, authorId, timestamp, Left.tag);

      this.endReason = endReason;
    }

    readonly endReason: EndReason;
  }

  export class MessageSent extends RoomEvent {
    static readonly tag = "room_message_sent";

    constructor(roomId: string, authorId: string, message: string, messageId: string, timestamp: number) {
      super(roomId, authorId, timestamp, MessageSent.tag);

      this.message = message;
      this.messageId = messageId;
    }

    readonly message: string;
    readonly messageId: string;
  }

  export class CustomMessageSent extends RoomEvent {
    static readonly tag = "room_custom_message_sent";

    constructor(roomId: string, authorId: string, message: string, messageId: string, tag: string, context: Object,
                timestamp: number) {
      super(roomId, authorId, timestamp, tag);

      this.message = message;
      this.messageId = messageId;
      this.context = context;
    }

    readonly message: string;
    readonly messageId: string;
    readonly context: Object;
  }

  export class TypingSent extends RoomEvent {
    static readonly tag = "room_typing_sent";

    constructor(roomId: string, authorId: string, timestamp: number) {
      super(roomId, authorId, timestamp, TypingSent.tag);
    }
  }

  export class MarkSent extends RoomEvent {
    static readonly tag = "room_mark_sent";

    constructor(roomId: string, authorId: string, timestamp: number) {
      super(roomId, authorId, timestamp, MarkSent.tag);
    }
  }

  export class MessageDelivered extends RoomEvent {
    static readonly tag = "room_message_delivered";

    constructor(roomId: string, authorId: string, messageId: string, timestamp: number) {
      super(roomId, authorId, timestamp, MessageDelivered.tag);

      this.messageId = messageId;
    }

    readonly messageId: string;

  }

}
