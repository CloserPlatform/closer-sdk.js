import { DomainEvent } from "./domain-event";

export namespace serverEvents {
  export class Hello implements DomainEvent {
    static readonly tag: string = "hello";
    readonly __discriminator__ = "domainEvent";

    constructor(deviceId: string, timestamp: number, heartbeatTimeout: number) {
      this.deviceId = deviceId;
      this.timestamp = timestamp;
      this.heartbeatTimeout = heartbeatTimeout;
    }

    readonly deviceId: string;
    readonly timestamp: number;
    readonly heartbeatTimeout: number;
    readonly tag = Hello.tag;
  }

  export class OutputHeartbeat implements DomainEvent {
    static readonly tag: string = "output_heartbeat";
    readonly __discriminator__ = "domainEvent";

    constructor(timestamp: number) {
      this.timestamp = timestamp;
    }

    readonly tag = OutputHeartbeat.tag;
    readonly timestamp: number;
  }
}
