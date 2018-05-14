import { DomainEvent } from "./domain-event";

export namespace rtcEvents {

  export abstract class RTCSignallingEvent implements DomainEvent {
    constructor(callId: string, sender: string, tag: string) {
      this.callId = callId;
      this.sender = sender;
      this.tag = tag;
    }

    readonly callId: string;
    readonly sender: string;
    readonly tag: string;
    readonly __discriminator__ = "domainEvent";
  }

  export class DescriptionSent extends RTCSignallingEvent {
    static readonly tag = "rtc_description_sent";

    constructor(callId: string, sender: string, sdp: RTCSessionDescriptionInit) {
      super(callId, sender, DescriptionSent.tag);
      this.sdp = sdp;
    }

    readonly sdp: RTCSessionDescriptionInit;
  }

  export class CandidateSent extends RTCSignallingEvent {
    static readonly tag = "rtc_candidate_sent";

    constructor(callId: string, sender: string, candidate: RTCIceCandidate) {
      super(callId, sender, CandidateSent.tag);
      this.candidate = candidate;
    }

    readonly candidate: RTCIceCandidate;
  }

}
