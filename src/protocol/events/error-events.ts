// tslint:disable:no-namespace
import { DomainEvent } from './domain-event';
import { Ref } from '../protocol';

export namespace errorEvents {
  export class Error implements DomainEvent {
    public static readonly tag = 'error';
    public readonly ref?: Ref;
    public readonly reason: string;
    public readonly tag: string;
    public readonly __discriminator__ = 'domainEvent';

    constructor(reason: string) {
      this.reason = reason;
      this.tag = Error.tag;
    }

    public static isError = (evt: DomainEvent): evt is errorEvents.Error =>
      evt.tag === errorEvents.Error.tag
  }
}
