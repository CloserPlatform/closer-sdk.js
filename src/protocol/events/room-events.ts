// tslint:disable:no-any
// tslint:disable:no-namespace
// tslint:disable:max-classes-per-file
// tslint:disable:ban-types
import { DomainEvent } from './domain-event';

export namespace roomEvents {
  export enum EndReason {
    Terminated = 'terminated',
    Timeout = 'timeout',
    Ended = 'ended',
    Hangup = 'hangup',
    ConnectionDropped = 'connection_dropped',
    Disconnected = 'disconnected',
    CallRejected = 'rejected',
    Busy = 'busy',
  }

  export abstract class RoomEvent implements DomainEvent {
    public readonly roomId: string;
    public readonly authorId: string;
    public readonly timestamp: number;
    public readonly tag: string;
    public readonly __discriminator__ = 'domainEvent';

    public static isRoomEvent = (e: DomainEvent): e is RoomEvent =>
      typeof (e as RoomEvent).roomId !== 'undefined'

    protected constructor(roomId: string, authorId: string, timestamp: number, tag: string) {
      this.roomId = roomId;
      this.authorId = authorId;
      this.timestamp = timestamp;
      this.tag = tag;
    }
  }

  export class Created extends RoomEvent {
    public static readonly tag = 'room_created';

    constructor(roomId: string, authorId: string, timestamp: number) {
      super(roomId, authorId, timestamp, Created.tag);
    }

    public static isCreated = (e: DomainEvent): e is Created =>
      e.tag === Created.tag
  }

  export class Invited extends RoomEvent {
    public static readonly tag = 'room_invited';
    public readonly invitee: string;

    constructor(roomId: string, authorId: string, invitee: string, timestamp: number) {
      super(roomId, authorId, timestamp, Invited.tag);

      this.invitee = invitee;
    }

    public static isInvited = (e: DomainEvent): e is Invited =>
      e.tag === Invited.tag
  }

  export class Joined extends RoomEvent {
    public static readonly tag = 'room_joined';

    constructor(roomId: string, authorId: string, timestamp: number) {
      super(roomId, authorId, timestamp, Joined.tag);
    }

    public static isJoined = (e: DomainEvent): e is Joined =>
      e.tag === Joined.tag
  }

  export class Left extends RoomEvent {
    public static readonly tag = 'room_left';
    public readonly endReason: EndReason;

    constructor(roomId: string, authorId: string, endReason: EndReason, timestamp: number) {
      super(roomId, authorId, timestamp, Left.tag);

      this.endReason = endReason;
    }

    public static isLeft = (e: DomainEvent): e is Left =>
      e.tag === Left.tag
  }

  export class MessageSent extends RoomEvent {
    public static readonly tag = 'room_message_sent';
    public readonly message: string;
    public readonly messageId: string;
    public readonly context: any;

    constructor(roomId: string, authorId: string, message: string, messageId: string, context: any,
                timestamp: number) {
      super(roomId, authorId, timestamp, MessageSent.tag);

      this.message = message;
      this.messageId = messageId;
      this.context = context;
    }

    public static isMessageSent = (e: DomainEvent): e is MessageSent =>
      e.tag === MessageSent.tag
  }

  export class CustomMessageSent extends RoomEvent {
    public static readonly tag = 'room_custom_message_sent';
    public readonly subtag: string;
    public readonly message: string;
    public readonly messageId: string;
    public readonly context: any;

    constructor(roomId: string, authorId: string, message: string, messageId: string, subtag: string, context: any,
                timestamp: number) {
      super(roomId, authorId, timestamp, CustomMessageSent.tag);

      this.subtag = subtag;
      this.message = message;
      this.messageId = messageId;
      this.context = context;
    }

    public static isCustomMessageSent = (e: DomainEvent): e is CustomMessageSent =>
      e.tag === CustomMessageSent.tag
  }

  export class TypingSent extends RoomEvent {
    public static readonly tag = 'room_typing_sent';

    constructor(roomId: string, authorId: string, timestamp: number) {
      super(roomId, authorId, timestamp, TypingSent.tag);
    }

    public static isTypingSent = (e: DomainEvent): e is TypingSent =>
      e.tag === TypingSent.tag
  }

  export class MarkSent extends RoomEvent {
    public static readonly tag = 'room_mark_sent';

    constructor(roomId: string, authorId: string, timestamp: number) {
      super(roomId, authorId, timestamp, MarkSent.tag);
    }

    public static isMarkSent = (e: DomainEvent): e is MarkSent =>
      e.tag === MarkSent.tag
  }

  export class MessageDelivered extends RoomEvent {
    public static readonly tag = 'room_message_delivered';
    public readonly messageId: string;

    constructor(roomId: string, authorId: string, messageId: string, timestamp: number) {
      super(roomId, authorId, timestamp, MessageDelivered.tag);

      this.messageId = messageId;
    }

    public static isMessageDelivered = (e: DomainEvent): e is MessageDelivered =>
      e.tag === MessageDelivered.tag
  }
}
