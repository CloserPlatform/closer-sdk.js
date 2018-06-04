// tslint:disable:no-namespace
import { DomainEvent } from './domain-event';

export namespace errorEvents {
  export class Error implements DomainEvent {
    public static readonly tag = 'error';
    public readonly reason: string;
    public readonly tag: string;
    public readonly __discriminator__ = 'domainEvent';

    constructor(reason: string) {
      this.reason = reason;
      this.tag = Error.tag;
    }

  }

  export const isError = (evt: DomainEvent): evt is errorEvents.Error =>
    evt.tag === errorEvents.Error.tag;
}
