import { DomainEvent } from './domain-event';

export namespace errorEvents {
  export class Error implements DomainEvent {
    static readonly tag = 'error';

    constructor(reason: string) {
      this.reason = reason;
      this.tag = Error.tag;
    }

    readonly reason: string;
    readonly tag: string;
    readonly __discriminator__ = 'domainEvent';
  }

  export function isError(evt: DomainEvent): evt is errorEvents.Error {
    return evt.tag === errorEvents.Error.tag;
  }

}
