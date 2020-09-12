// tslint:disable:no-namespace
// tslint:disable:max-classes-per-file
import { DomainCommand } from './domain-command';
import { Ref, Context } from '../protocol';

export namespace roomCommand {

  export abstract class RoomCommand implements DomainCommand {

    public readonly roomId: string;
    public readonly tag: string;
    public readonly __discriminator__ = 'domainCommand';

    protected constructor(roomId: string, tag: string) {
      this.roomId = roomId;
      this.tag = tag;
    }
  }

  export class SendMessage extends RoomCommand {
    public static readonly tag = 'room_send_message';

    public readonly ref?: Ref;
    public readonly body: string;
    public readonly context: Context;

    constructor(roomId: string, body: string, context: Context, ref?: Ref) {
      super(roomId, SendMessage.tag);
      this.body = body;
      this.context = context;
      this.ref = ref;
    }
  }

  export class SendCustomMessage extends RoomCommand {
    public static readonly tag = 'room_send_custom_message';

    public readonly ref?: Ref;
    public readonly body: string;
    public readonly context: Context;
    public readonly subtag: string;

    constructor(roomId: string, body: string, subtag: string, context: Context, ref?: Ref) {
      super(roomId, SendCustomMessage.tag);
      this.body = body;
      this.ref = ref;
      this.subtag = subtag;
      this.context = context;
    }
  }

  export class SendTyping extends RoomCommand {
    public static readonly tag = 'room_send_typing';

    constructor(roomId: string) {
      super(roomId, SendTyping.tag);
    }
  }

  export class SendMark extends RoomCommand {
    public static readonly tag = 'room_send_mark';

    public readonly timestamp: number;

    constructor(roomId: string, timestamp: number) {
      super(roomId, SendMark.tag);
      this.timestamp = timestamp;
    }
  }

  export class ConfirmMessageDelivery extends RoomCommand {
    public static readonly tag = 'room_confirm_message_delivery';

    public readonly eventId: string;
    public readonly timestamp: number;

    constructor(roomId: string, eventId: string, timestamp: number) {
      super(roomId, ConfirmMessageDelivery.tag);
      this.eventId = eventId;
      this.timestamp = timestamp;
    }
  }

}
