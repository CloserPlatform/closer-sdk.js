// tslint:disable:no-namespace
// tslint:disable:max-classes-per-file
// tslint:disable:ban-types
import { DomainEvent } from './domain-event';

export namespace rtcEvents {

  export abstract class RTCSignallingEvent implements DomainEvent {
    public readonly callId: string;
    public readonly sender: string;
    public readonly tag: string;
    public readonly __discriminator__ = 'domainEvent';

    constructor(callId: string, sender: string, tag: string) {
      this.callId = callId;
      this.sender = sender;
      this.tag = tag;
    }

    public static is(e: DomainEvent): e is RTCSignallingEvent {
      return typeof (e as RTCSignallingEvent).callId !== 'undefined';
    }
  }

  export class DescriptionSent extends RTCSignallingEvent {
    public static readonly tag = 'rtc_description_sent';
    public readonly sdp: RTCSessionDescriptionInit;

    constructor(callId: string, sender: string, sdp: RTCSessionDescriptionInit) {
      super(callId, sender, DescriptionSent.tag);
      this.sdp = sdp;
    }

    public static is(e: DomainEvent): e is DescriptionSent {
      return e.tag === DescriptionSent.tag;
    }
  }

  export class CandidateSent extends RTCSignallingEvent {
    public static readonly tag = 'rtc_candidate_sent';
    public readonly candidate: RTCIceCandidate;

    constructor(callId: string, sender: string, candidate: RTCIceCandidate) {
      super(callId, sender, CandidateSent.tag);
      this.candidate = candidate;
    }

    public static is(e: DomainEvent): e is CandidateSent {
      return e.tag === CandidateSent.tag;
    }
  }

}
