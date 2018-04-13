import { DomainEvent } from "./domain-event";

export namespace internalEvents {

  export class ServerBecameUnreachable implements DomainEvent {
    static readonly tag = "server_became_unreachable";
    readonly tag: string = ServerBecameUnreachable.tag;
  }

  export class WebsocketDisconnected implements DomainEvent {
    static readonly tag = "websocket_disconnected";

    constructor(code: number, reason: string) {
      this.code = code;
      this.reason = reason;
    }

    readonly code: number;
    readonly reason: string;
    readonly tag: string = WebsocketDisconnected.tag;
  }

}
