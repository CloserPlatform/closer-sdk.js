import { DomainCommand } from "./domain-command";

export namespace roomCommand {
  export abstract class RoomCommand implements DomainCommand {
    protected constructor(roomId: string, tag: string) {
      this.roomId = roomId;
      this.tag = tag;
    }

    readonly roomId: string;
    readonly tag: string;
  }

  export class SendMessage extends RoomCommand {
    static readonly tag = "room_send_message";

    constructor(roomId: string, body: string, ref?: string) {
      super(roomId, SendMessage.tag);
      this.body = body;
      this.ref = ref;
    }

    readonly body: string;
    readonly ref: string | undefined;
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
