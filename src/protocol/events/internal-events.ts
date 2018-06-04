// tslint:disable:no-namespace
// tslint:disable:max-classes-per-file
// tslint:disable:ban-types
import { DomainEvent } from './domain-event';

export namespace internalEvents {

  export class ServerBecameUnreachable implements DomainEvent {
    public static readonly tag = 'server_became_unreachable';
    public readonly tag: string = ServerBecameUnreachable.tag;
    public readonly __discriminator__ = 'domainEvent';
  }

  export class WebsocketDisconnected implements DomainEvent {
    public static readonly tag = 'websocket_disconnected';
    public readonly code: number;
    public readonly reason: string;
    public readonly tag: string = WebsocketDisconnected.tag;
    public readonly __discriminator__ = 'domainEvent';

    constructor(code: number, reason: string) {
      this.code = code;
      this.reason = reason;
    }
  }
}
