// tslint:disable:max-file-line-count
// FIXME Unfuck when Chrome transitions to the Unified Plan.
import { errorEvents } from '../protocol/events/error-events';
import { Logger } from '../logger';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { ID } from '../protocol/protocol';
import { Callback, EventHandler } from '../events/event-handler';
import { HackedRTCPeerConnection } from './hacked-rtc-peer-connection';
import { HackedMediaStreamEvent } from './hacked-mediastream-event';
import { HackedRTCOfferOptions } from './hacked-rtc-offer-options';
import { RTCAnswerOptions } from './rtc-answer-options';
import { RTCConfig } from './rtc-config';
import { TimeUtils } from '../utils/time-utils';

export class RTCConnection {
  public static readonly renegotiationTimeout = 100;
  private call: ID;
  private peer: ID;
  private api: ArtichokeAPI;
  private events: EventHandler;
  private log: Logger;
  private conn: HackedRTCPeerConnection;
  private onICEDoneCallback: () => void;
  private onRemoteStreamCallback: Callback<MediaStream>;
  private offerOptions?: HackedRTCOfferOptions;
  private answerOptions?: RTCAnswerOptions;

  // FIXME Required by the various hacks:
  private localRole?: string;
  private attachedStreams: { [trackId: string]: MediaStream };
  private renegotiationTimer: number;

  constructor(call: ID, peer: ID, config: RTCConfig, log: Logger, events: EventHandler, api: ArtichokeAPI,
              answerOptions?: RTCAnswerOptions, offerOptions?: HackedRTCOfferOptions) {
    log.info(`Connecting an RTC connection to ${peer} on ${call}`);
    this.call = call;
    this.peer = peer;
    this.api = api;
    this.events = events;
    this.log = log;
    this.answerOptions = answerOptions;
    this.offerOptions = offerOptions;
    this.conn = new (RTCPeerConnection as HackedRTCPeerConnection)(config);

    this.localRole = undefined;
    this.attachedStreams = {};

    this.onRemoteStreamCallback = (_stream): void => {
      // Do nothing.
      this.log.warn('Empty onRemoteStreamCallback called');
    };

    this.onICEDoneCallback = (): void => {
      // Do nothing.
      this.log.warn('Empty onICEDoneCallback called');
    };

    this.conn.onicecandidate = (event): void => {
      if (event.candidate) {
        this.log.debug(`Created ICE candidate: ${event.candidate.candidate}`);
        this.api.sendCandidate(this.call, this.peer, event.candidate).catch((err) => {
          this.events.notify(new errorEvents.Error(`Could not send an ICE candidate: ${err}`));
        });
      } else {
        this.log.debug('Done gathering ICE candidates.');
        this.onICEDoneCallback();
      }
    };

    this.conn.ontrack = (event: HackedMediaStreamEvent): void => {
      this.log.info('Received a remote stream.');
      const streams: ReadonlyArray<MediaStream | null> =
        (typeof event.streams !== 'undefined') ? event.streams : [event.stream];
      streams.forEach((stream) => {
        if (stream) {
          this.onRemoteStreamCallback(stream);
        } else {
          this.log.warn('Received stream is null');
        }
      });
    };

    this.conn.onnegotiationneeded = (_event): void => {
      // FIXME Chrome triggers renegotiation on... Initial offer creation...
      // FIXME Firefox triggers renegotiation when remote offer is received.
      if (this.isEstablished()) {
        this.renegotiationTimer = TimeUtils.onceDelayed(
          this.renegotiationTimer, RTCConnection.renegotiationTimeout, () => {
          this.log.debug('Renegotiating an RTC connection.');
          this.offer().catch((err) => {
            this.events.notify(new errorEvents.Error(`Could not renegotiate the connection: ${err}`));
          });
        });
      }
    };
  }

  public disconnect(): void {
    this.log.info('Disconnecting an RTC connection.');
    this.conn.close();
  }

  public addTrack(track: MediaStreamTrack, stream?: MediaStream): void {
    this.log.debug('Adding a stream track.');
    // FIXME Chrome's adapter.js shim still doesn't implement removeTrack().
    if (RTCConnection.supportsTracks(this.conn)) {
      this.conn.addTrack(track, stream);
    } else {
      const hackedStream = stream || new MediaStream([track]);
      this.attachedStreams[track.id] = hackedStream;
      this.conn.addStream(hackedStream);
    }
  }

  public removeTrack(track: MediaStreamTrack): void {
    this.log.debug('Removing a stream track.');
    // FIXME Chrome's adapter.js shim still doesn't implement removeTrack().
    if (RTCConnection.supportsTracks(this.conn)) {
      this.conn.getSenders().filter((s) => s.track === track).forEach((t) => this.conn.removeTrack(t));
    } else if (track.id in this.attachedStreams) {
      this.conn.removeStream(this.attachedStreams[track.id]);
    }
  }

  public addCandidate(candidate: RTCIceCandidate): Promise<void> {
    this.log.debug(`Received an RTC candidate: ${candidate.candidate}`);

    return this.conn.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
  }

  public offer(options?: HackedRTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    this.log.debug('Creating an RTC offer.');

    return this.conn.createOffer(options || this.offerOptions).then((offer) =>
      this.setLocalDescription(offer as RTCSessionDescriptionInit)).then((offer) =>
      this.api.sendDescription(this.call, this.peer, offer).then(() => offer)).then((offer) => {
      this.log.debug(`Sent an RTC offer: ${offer.sdp}`);

      return offer;
    });
  }

  public addOffer(remoteDescription: RTCSessionDescriptionInit,
                  options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    this.log.debug('Received an RTC offer.');

    return this.setRemoteDescription(remoteDescription).then((_descr) => this.answer(options));
  }

  public answer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    this.log.debug('Creating an RTC answer.');

    return this.conn.createAnswer(options || this.answerOptions).then((answer) =>
      // FIXME Chrome does not support DTLS role changes.
      this.setLocalDescription(this.patchSDP(answer as RTCSessionDescriptionInit))
    ).then((answer) =>
      this.api.sendDescription(this.call, this.peer, answer).then(() => answer)).then((answer) => {
      this.log.debug(`Sent an RTC answer: ${answer.sdp}`);

      return answer;
    });
  }

  public addAnswer(remoteDescription: RTCSessionDescriptionInit): Promise<void> {
    this.log.debug('Received an RTC answer.');

    return this.setRemoteDescription(remoteDescription).then((descr) => {
      // FIXME Chrome does not support DTLS role changes.
      this.extractRole(descr);
    });
  }

  public onRemoteStream(callback: Callback<MediaStream>): void {
    this.onRemoteStreamCallback = callback;
  }

  // FIXME This is only used by tests...
  public onICEDone(callback: () => void): void {
    this.onICEDoneCallback = callback;
  }

  // FIXME This should be private.
  public setRemoteDescription(remoteDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.log.debug('Setting remote RTC description.');

    // FIXME
    // sdp is string | null or string | undefined - remove casting
    return this.conn.setRemoteDescription(new RTCSessionDescription(remoteDescription) as RTCSessionDescriptionInit)
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

  private static supportsTracks(pc: HackedRTCPeerConnection): boolean {
    return (typeof pc.addTrack !== 'undefined') && (typeof pc.removeTrack !== 'undefined');
  }

  private updateRole(descr: RTCSessionDescriptionInit, role: string): RTCSessionDescriptionInit {
    const hackedDescr = descr;
    if (hackedDescr.sdp) {
      hackedDescr.sdp = hackedDescr.sdp.replace(/a=setup:[^\r\n]+/, `a=setup:${role}`);
    } else {
      this.log.warn('Cannot update ROLE, there is not sdp in RTCSessionDescriptionInit');
    }

    return hackedDescr;
  }

  private setLocalDescription(localDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.log.debug('Setting local RTC description.');

    // FIXME
    // sdp is string | null or string | undefined - remove casting
    return this.conn.setLocalDescription(new RTCSessionDescription(localDescription) as RTCSessionDescriptionInit)
      .then(() => localDescription);
  }

  private isEstablished(): boolean {
    // NOTE 'stable' means no exchange is going on, which encompases 'fresh'
    // NOTE RTC connections as well as established ones.
    if (typeof this.conn.connectionState !== 'undefined') {
      return this.conn.connectionState === 'connected';
    } else {
      // FIXME Firefox does not support connectionState: https://bugzilla.mozilla.org/show_bug.cgi?id=1265827
      return this.conn.signalingState === 'stable' &&
        (this.conn.iceConnectionState === 'connected' || this.conn.iceConnectionState === 'completed');
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
