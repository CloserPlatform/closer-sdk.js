// tslint:disable:no-namespace
// tslint:disable:max-classes-per-file
// tslint:disable:ban-types
import { DomainEvent } from './domain-event';

export namespace serverEvents {
  export class Hello implements DomainEvent {
    public static readonly tag: string = 'hello';
    public readonly __discriminator__ = 'domainEvent';
    public readonly deviceId: string;
    public readonly timestamp: number;
    public readonly tag = Hello.tag;

    constructor(deviceId: string, timestamp: number) {
      this.deviceId = deviceId;
      this.timestamp = timestamp;
    }

    public static is = (e: DomainEvent): e is Hello =>
      e.tag === Hello.tag
  }

}
