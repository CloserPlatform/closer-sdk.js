import { DomainEvent } from './domain-event';

export namespace callEvents {
  export enum EndReason {
    Terminated = 'terminated',
    Timeout = 'timeout',
    Ended = 'ended',
    Hangup = 'hangup',
    ConnectionDropped = 'connection_dropped',
    Disconnected = 'disconnected',
    CallRejected = 'rejected',
    Busy = 'busy',
  }

  export abstract class CallEvent implements DomainEvent {
    protected constructor(callId: string, timestamp: number, tag: string) {
      this.callId = callId;
      this.timestamp = timestamp;
      this.tag = tag;
    }

    readonly callId: string;
    readonly timestamp: number;
    readonly tag: string;
    readonly __discriminator__ = 'domainEvent';
  }

  export class Created extends CallEvent {
    static readonly tag = 'call_created';

    constructor(callId: string, authorId: string, timestamp: number) {
      super(callId, timestamp, Created.tag);
      this.authorId = authorId;
    }

    readonly authorId: string;
  }

  export class Invited extends CallEvent {
    static readonly tag = 'call_invited';

    constructor(callId: string, authorId: string, invitee: string, context: Object, timestamp: number) {
      super(callId, timestamp, Invited.tag);

      this.invitee = invitee;
      this.context = context;
      this.authorId = authorId;
    }

    readonly authorId: string;
    readonly invitee: string;
    readonly context: Object;
  }

  export class Answered extends CallEvent {
    static readonly tag = 'call_answered';

    constructor(callId: string, authorId: string, timestamp: number) {
      super(callId, timestamp, Answered.tag);
      this.authorId = authorId;
    }

    readonly authorId: string;
  }

  export class Joined extends CallEvent {
    static readonly tag = 'call_joined';

    constructor(callId: string, authorId: string, timestamp: number) {
      super(callId, timestamp, Joined.tag);
      this.authorId = authorId;
    }

    readonly authorId: string;
  }

  export class Left extends CallEvent {
    static readonly tag = 'call_left';

    constructor(callId: string, authorId: string, reason: EndReason, timestamp: number) {
      super(callId, timestamp, Left.tag);

      this.authorId = authorId;
      this.reason = reason;
    }

    readonly authorId: string;
    readonly reason: EndReason;
  }

  export class Rejected extends CallEvent {
    static readonly tag = 'call_rejected';
    constructor(callId: string, authorId: string, reason: EndReason, timestamp: number) {
      super(callId, timestamp, Rejected.tag);

      this.authorId = authorId;
      this.reason = reason;
    }

    readonly authorId: string;
    readonly reason: EndReason;
  }

  export class Ended extends CallEvent {
    static readonly tag = 'call_ended';
    constructor(callId: string, reason: EndReason, timestamp: number) {
      super(callId, timestamp, Ended.tag);

      this.reason = reason;
    }

    readonly reason: EndReason;
  }

  export class CallHandledOnDevice extends CallEvent {
    static readonly tag = 'call_handled_on_device';
    constructor(callId: string, authorId: string, device: string, timestamp: number) {
      super(callId, timestamp, CallHandledOnDevice.tag);

      this.authorId = authorId;
      this.device = device;
    }

    readonly authorId: string;
    readonly device: string;
  }

  export class DeviceOffline extends CallEvent {
    static readonly tag = 'device_offline';
    constructor(callId: string, userId: string, deviceId: string, timestamp: number) {
      super(callId, timestamp, DeviceOffline.tag);

      this.userId = userId;
      this.deviceId = deviceId;
    }

    readonly userId: string;
    readonly deviceId: string;
  }

  export class DeviceOnline extends CallEvent {
    static readonly tag = 'device_online';
    constructor(callId: string, userId: string, deviceId: string, timestamp: number) {
      super(callId, timestamp, DeviceOnline.tag);

      this.userId = userId;
      this.deviceId = deviceId;
    }

    readonly userId: string;
    readonly deviceId: string;
  }

}
