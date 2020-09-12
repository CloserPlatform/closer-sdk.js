// tslint:disable:no-namespace
// tslint:disable:max-classes-per-file
import { DomainEvent } from './domain-event';

export namespace chatEvents {

  export abstract class ChatEvent implements DomainEvent {
    public readonly eventId: string;
    public readonly tag: string;
    public readonly __discriminator__ = 'domainEvent';

    protected constructor(eventId: string, tag: string) {
      this.eventId = eventId;
      this.tag = tag;
    }
  }

  export interface NormalizedEvent {
    readonly id: string;
    readonly authorId: string;
    readonly channelId: string;
    readonly tag: string;
    // tslint:disable-next-line:no-any
    readonly data: any;
    readonly timestamp: number;
  }

  export class Received extends ChatEvent {
    public static readonly tag = 'chat_received';

    public readonly message: NormalizedEvent;
    public readonly ref?: string;

    constructor(eventId: string, message: NormalizedEvent, ref?: string) {
      super(eventId, Received.tag);

      this.message = message;
      this.ref = ref;
    }

    public static isReceived(event: DomainEvent): event is Received {
      return event.tag === Received.tag;
    }
  }

}
