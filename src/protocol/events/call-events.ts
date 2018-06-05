// tslint:disable:no-namespace
// tslint:disable:max-classes-per-file
// tslint:disable:ban-types

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
    public readonly callId: string;
    public readonly timestamp: number;
    public readonly tag: string;
    public readonly __discriminator__ = 'domainEvent';

    protected constructor(callId: string, timestamp: number, tag: string) {
      this.callId = callId;
      this.timestamp = timestamp;
      this.tag = tag;
    }
  }

  export class Created extends CallEvent {
    public static readonly tag = 'call_created';
    public readonly authorId: string;

    constructor(callId: string, authorId: string, timestamp: number) {
      super(callId, timestamp, Created.tag);
      this.authorId = authorId;
    }
  }

  export class Invited extends CallEvent {
    public static readonly tag = 'call_invited';
    public readonly authorId: string;
    public readonly invitee: string;
    public readonly context: Object;

    constructor(callId: string, authorId: string, invitee: string, context: Object, timestamp: number) {
      super(callId, timestamp, Invited.tag);

      this.invitee = invitee;
      this.context = context;
      this.authorId = authorId;
    }
  }

  export class Answered extends CallEvent {
    public static readonly tag = 'call_answered';
    public readonly authorId: string;

    constructor(callId: string, authorId: string, timestamp: number) {
      super(callId, timestamp, Answered.tag);
      this.authorId = authorId;
    }
  }

  export class Joined extends CallEvent {
    public static readonly tag = 'call_joined';
    public readonly authorId: string;

    constructor(callId: string, authorId: string, timestamp: number) {
      super(callId, timestamp, Joined.tag);
      this.authorId = authorId;
    }
  }

  export class Left extends CallEvent {
    public static readonly tag = 'call_left';
    public readonly authorId: string;
    public readonly reason: EndReason;

    constructor(callId: string, authorId: string, reason: EndReason, timestamp: number) {
      super(callId, timestamp, Left.tag);

      this.authorId = authorId;
      this.reason = reason;
    }
  }

  export class Rejected extends CallEvent {
    public static readonly tag = 'call_rejected';
    public readonly authorId: string;
    public readonly reason: EndReason;

    constructor(callId: string, authorId: string, reason: EndReason, timestamp: number) {
      super(callId, timestamp, Rejected.tag);

      this.authorId = authorId;
      this.reason = reason;
    }
  }

  export class Ended extends CallEvent {
    public static readonly tag = 'call_ended';
    public readonly reason: EndReason;

    constructor(callId: string, reason: EndReason, timestamp: number) {
      super(callId, timestamp, Ended.tag);

      this.reason = reason;
    }
  }

  export class CallHandledOnDevice extends CallEvent {
    public static readonly tag = 'call_handled_on_device';
    public readonly authorId: string;
    public readonly device: string;

    constructor(callId: string, authorId: string, device: string, timestamp: number) {
      super(callId, timestamp, CallHandledOnDevice.tag);

      this.authorId = authorId;
      this.device = device;
    }
  }

  export class DeviceOffline extends CallEvent {
    public static readonly tag = 'device_offline';
    public readonly userId: string;
    public readonly deviceId: string;

    constructor(callId: string, userId: string, deviceId: string, timestamp: number) {
      super(callId, timestamp, DeviceOffline.tag);

      this.userId = userId;
      this.deviceId = deviceId;
    }
  }

  export class DeviceOnline extends CallEvent {
    public static readonly tag = 'device_online';
    public readonly userId: string;
    public readonly deviceId: string;

    constructor(callId: string, userId: string, deviceId: string, timestamp: number) {
      super(callId, timestamp, DeviceOnline.tag);

      this.userId = userId;
      this.deviceId = deviceId;
    }
  }
}
