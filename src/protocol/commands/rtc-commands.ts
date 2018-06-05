// tslint:disable:no-namespace
// tslint:disable:max-classes-per-file
// tslint:disable:ban-types
// tslint:disable:member-ordering
// tslint:disable:member-access
import { DomainCommand } from './domain-command';

export namespace rtcCommands {

  export abstract class RTCSignallingCommand implements DomainCommand {
    constructor(callId: string, peer: string, tag: string) {
      this.callId = callId;
      this.peer = peer;
      this.tag = tag;
    }

    readonly callId: string;
    readonly peer: string;
    readonly tag: string;
    readonly __discriminator__ = 'domainCommand';
  }

  export class SendDescription extends RTCSignallingCommand {
    static readonly tag = 'rtc_send_description';
    constructor(callId: string, peer: string, sdp: RTCSessionDescriptionInit) {
      super(callId, peer, SendDescription.tag);
      this.sdp = sdp;
    }
    readonly sdp: RTCSessionDescriptionInit;
  }

  export class SendCandidate extends RTCSignallingCommand {
    static readonly tag = 'rtc_send_candidate';
    constructor(callId: string, peer: string, iceCandidate: RTCIceCandidate) {
      super(callId, peer, SendCandidate.tag);
      this.iceCandidate = iceCandidate;
    }

    readonly iceCandidate: RTCIceCandidate;
  }

}
