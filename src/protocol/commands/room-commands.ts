import { DomainCommand } from "./domain-command";

export namespace roomCommand {

  export abstract class RoomCommand implements DomainCommand {
    protected constructor(roomId: string, tag: string) {
      this.roomId = roomId;
      this.tag = tag;
    }

    readonly roomId: string;
    readonly tag: string;
    readonly __discriminator__ = "domainCommand";
  }

  export class SendMessage extends RoomCommand {
    static readonly tag = "room_send_message";

    constructor(roomId: string, body: string, context: Object, ref?: string) {
      super(roomId, SendMessage.tag);
      this.body = body;
      this.context = context;
      this.ref = ref;
    }

    readonly body: string;
    readonly context: Object;
    ref: string | undefined;
  }

  export class SendCustomMessage extends RoomCommand {
    static readonly tag = "room_send_custom_message";

    constructor(roomId: string, body: string, subtag: string, context: Object, ref?: string) {
      super(roomId, SendCustomMessage.tag);
      this.body = body;
      this.ref = ref;
      this.subtag = subtag;
      this.context = context;
    }

    readonly body: string;
    ref: string | undefined;
    readonly context: Object;
    readonly subtag: string;
  }

  export class SendTyping extends RoomCommand {
    static readonly tag = "room_send_typing";

    constructor(roomId: string) {
      super(roomId, SendTyping.tag);
    }
  }

  export class SendMark extends RoomCommand {
    static readonly tag = "room_send_mark";

    constructor(roomId: string, timestamp: number) {
      super(roomId, SendMark.tag);
      this.timestamp = timestamp;
    }

    readonly timestamp: number;
  }

  export class ConfirmMessageDelivery extends RoomCommand {
    static readonly tag = "room_confirm_message_delivery";

    constructor(roomId: string, eventId: string, timestamp: number) {
      super(roomId, ConfirmMessageDelivery.tag);
      this.eventId = eventId;
      this.timestamp = timestamp;
    }

    readonly eventId: string;
    readonly timestamp: number;
  }

}
