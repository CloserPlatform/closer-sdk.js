import { Logger } from '../logger';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { ID } from '../protocol/protocol';
import { RTCConfig } from './rtc-config';
import { TimeUtils } from '../utils/time-utils';
import { Observable, Subject } from 'rxjs';

export class RTCConnection {
  public static readonly renegotiationTimeout = 100;
  private rtcPeerConnection: RTCPeerConnection;
  private onICEDoneCallback: () => void;
  private remoteStreamEvent = new Subject<MediaStream>();

  // FIXME Required by the various hacks:
  private localRole?: string;
  private attachedStreams: { [trackId: string]: MediaStream };
  private renegotiationTimer: number;

  constructor(private callId: ID, private peerId: ID, config: RTCConfig, private logger: Logger,
              private artichokeApi: ArtichokeAPI,
              private answerOptions?: RTCAnswerOptions, private offerOptions?: RTCOfferOptions) {
    logger.info(`Connecting an RTC connection to ${peerId} on ${callId}`);
    this.rtcPeerConnection = new RTCPeerConnection(config);

    this.localRole = undefined;
    this.attachedStreams = {};

    this.onICEDoneCallback = (): void => {
      // Do nothing.
      this.logger.warn('Empty onICEDoneCallback called');
    };

    this.rtcPeerConnection.onicecandidate = (event): void => {
      if (event.candidate) {
        this.logger.debug(`Created ICE candidate: ${event.candidate.candidate}`);
        this.artichokeApi.sendCandidate(this.callId, this.peerId, event.candidate)
          .then(_ => this.logger.debug('Candidtae sent successfully'))
          .catch(err => this.logger.error(`Could not send an ICE candidate: ${err}`));
      } else {
        this.logger.debug('Done gathering ICE candidates.');
        this.onICEDoneCallback();
      }
    };

    this.rtcPeerConnection.ontrack = (event: RTCTrackEvent): void => {
      this.logger.info('Received a remote track.');
      event.streams.forEach(stream => this.remoteStreamEvent.next(stream));
    };

    this.rtcPeerConnection.onnegotiationneeded = (_event): void => {
      // FIXME Chrome triggers renegotiation on... Initial offer creation...
      // FIXME Firefox triggers renegotiation when remote offer is received.
      if (this.isEstablished()) {
        this.renegotiationTimer = TimeUtils.onceDelayed(
          this.renegotiationTimer, RTCConnection.renegotiationTimeout, () => {
          this.logger.debug('Renegotiating an RTC connection.');
          this.offer().catch(err => this.logger.error(`Could not renegotiate the connection: ${err}`));
        });
      }
    };
  }

  public disconnect(): void {
    this.logger.info('Disconnecting an RTC connection.');
    this.rtcPeerConnection.close();
  }

  public addTrack(track: MediaStreamTrack, stream?: MediaStream): void {
    this.logger.debug('Adding a stream track.');
    // FIXME Chrome's adapter.js shim still doesn't implement removeTrack().
    if (RTCConnection.supportsTracks(this.rtcPeerConnection)) {
      if (stream) {
        this.rtcPeerConnection.addTrack(track, stream);
      } else {
        this.rtcPeerConnection.addTrack(track);
      }
    } else {
      const hackedStream = stream || new MediaStream([track]);
      this.attachedStreams[track.id] = hackedStream;
      this.rtcPeerConnection.addStream(hackedStream);
    }
  }

  public removeTrack(track: MediaStreamTrack): void {
    this.logger.debug('Removing a stream track.');
    // FIXME Chrome's adapter.js shim still doesn't implement removeTrack().
    if (RTCConnection.supportsTracks(this.rtcPeerConnection)) {
      this.rtcPeerConnection.getSenders().filter(
        (s) => s.track === track).forEach((t) => this.rtcPeerConnection.removeTrack(t));
    } else if (track.id in this.attachedStreams) {
      this.rtcPeerConnection.removeStream(this.attachedStreams[track.id]);
    }
  }

  public addCandidate(candidate: RTCIceCandidate): Promise<void> {
    this.logger.debug(`Received an RTC candidate: ${candidate.candidate}`);

    return this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
  }

  public offer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Creating an RTC offer.');

    return this.rtcPeerConnection.createOffer(options || this.offerOptions).then((offer) =>
      this.setLocalDescription(offer as RTCSessionDescriptionInit)).then((offer) =>
      this.artichokeApi.sendDescription(this.callId, this.peerId, offer).then(() => offer)).then((offer) => {
      this.logger.debug(`Sent an RTC offer: ${offer.sdp}`);

      return offer;
    });
  }

  public addOffer(remoteDescription: RTCSessionDescriptionInit,
                  options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Received an RTC offer.');

    return this.setRemoteDescription(remoteDescription).then((_descr) => this.answer(options));
  }

  public answer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Creating an RTC answer.');

    return this.rtcPeerConnection.createAnswer(options || this.answerOptions).then((answer) =>
      // FIXME Chrome does not support DTLS role changes.
      this.setLocalDescription(this.patchSDP(answer as RTCSessionDescriptionInit))
    ).then((answer) =>
      this.artichokeApi.sendDescription(this.callId, this.peerId, answer).then(() => answer)).then((answer) => {
      this.logger.debug(`Sent an RTC answer: ${answer.sdp}`);

      return answer;
    });
  }

  public addAnswer(remoteDescription: RTCSessionDescriptionInit): Promise<void> {
    this.logger.debug('Received an RTC answer.');

    return this.setRemoteDescription(remoteDescription).then((descr) => {
      // FIXME Chrome does not support DTLS role changes.
      this.extractRole(descr);
    });
  }

  public get remoteStream$(): Observable<MediaStream> {
    return this.remoteStreamEvent;
  }

  // FIXME This is only used by tests...
  public onICEDone(callback: () => void): void {
    this.onICEDoneCallback = callback;
  }

  // FIXME This should be private.
  public setRemoteDescription(remoteDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Setting remote RTC description.');

    // FIXME
    // sdp is string | null or string | undefined - remove casting
    return this.rtcPeerConnection.setRemoteDescription(
      new RTCSessionDescription(remoteDescription) as RTCSessionDescriptionInit)
      .then(() => remoteDescription);
  }

  private static getRole(descr: RTCSessionDescriptionInit): string | undefined {
    if (descr.sdp) {
      const reg = /a=setup:([^\r\n]+)/.exec(descr.sdp);
      if (reg) {
        return reg[1];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  private static supportsTracks(pc: RTCPeerConnection): boolean {
    return (typeof pc.addTrack !== 'undefined') && (typeof pc.removeTrack !== 'undefined');
  }

  private updateRole(descr: RTCSessionDescriptionInit, role: string): RTCSessionDescriptionInit {
    const hackedDescr = descr;
    if (hackedDescr.sdp) {
      hackedDescr.sdp = hackedDescr.sdp.replace(/a=setup:[^\r\n]+/, `a=setup:${role}`);
    } else {
      this.logger.warn('Cannot update ROLE, there is not sdp in RTCSessionDescriptionInit');
    }

    return hackedDescr;
  }

  private setLocalDescription(localDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Setting local RTC description.');

    // FIXME
    // sdp is string | null or string | undefined - remove casting
    return this.rtcPeerConnection.setLocalDescription(
      new RTCSessionDescription(localDescription) as RTCSessionDescriptionInit)
      .then(() => localDescription);
  }

  private isEstablished(): boolean {
    // NOTE 'stable' means no exchange is going on, which encompases 'fresh'
    // NOTE RTC connections as well as established ones.
    if (typeof this.rtcPeerConnection.connectionState !== 'undefined') {
      return this.rtcPeerConnection.connectionState === 'connected';
    } else {
      // FIXME Firefox does not support connectionState: https://bugzilla.mozilla.org/show_bug.cgi?id=1265827
      return this.rtcPeerConnection.signalingState === 'stable' &&
        (this.rtcPeerConnection.iceConnectionState === 'connected' ||
          this.rtcPeerConnection.iceConnectionState === 'completed');
    }
  }

  private extractRole(descr: RTCSessionDescriptionInit): void {
    if (this.localRole === undefined) {
      this.localRole = (RTCConnection.getRole(descr) === 'active') ? 'passive' : 'active';
    }
  }

  private patchSDP(descr: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
    if (this.localRole !== undefined) {
      return this.updateRole(descr, this.localRole);
    } else {
      this.localRole = RTCConnection.getRole(descr);

      return descr;
    }
  }
}
