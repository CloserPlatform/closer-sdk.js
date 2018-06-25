import { Logger } from '../logger';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { ID } from '../protocol/protocol';
import { RTCConfig } from './rtc-config';
import { TimeUtils } from '../utils/time-utils';
import { Observable, Subject } from 'rxjs';

export class RTCConnection {
  public static readonly renegotiationTimeout = 100;
  private rtcPeerConnection: RTCPeerConnection;
  private remoteTrackEvent = new Subject<MediaStreamTrack>();

  // FIXME Required by the various hacks:
  private renegotiationTimer: number;

  constructor(private callId: ID, private peerId: ID, config: RTCConfig, private logger: Logger,
              private artichokeApi: ArtichokeAPI,
              private answerOptions?: RTCAnswerOptions, private offerOptions?: RTCOfferOptions) {
    logger.info(`Connecting an RTC connection to ${peerId} on ${callId}`);
    this.rtcPeerConnection = new RTCPeerConnection(config);

    this.rtcPeerConnection.onicecandidate = (event): void => {
      if (event.candidate) {
        this.logger.debug(`Created ICE candidate: ${event.candidate.candidate}`);
        this.artichokeApi.sendCandidate(this.callId, this.peerId, event.candidate)
          .then(_ => this.logger.debug('Candidtae sent successfully'))
          .catch(err => this.logger.error(`Could not send an ICE candidate: ${err}`));
      } else {
        this.logger.debug('Done gathering ICE candidates.');
      }
    };

    this.rtcPeerConnection.ontrack = (event: RTCTrackEvent): void => {
      this.logger.info('Received a remote track.');
      this.remoteTrackEvent.next(event.track);
    };

    this.rtcPeerConnection.onnegotiationneeded = (_event): void => {
      this.logger.warn('RTC Connection: On Negotiation needed');
      // FIXME Chrome triggers renegotiation on... Initial offer creation...
      // FIXME Firefox triggers renegotiation when remote offer is received.
      if (this.isEstablished()) {
        this.renegotiationTimer = TimeUtils.onceDelayed(
          this.renegotiationTimer, RTCConnection.renegotiationTimeout, () => {
            this.logger.debug('Renegotiating an RTC connection.');
            this.offer().catch(err => this.logger.error(`Could not renegotiate the connection: ${err}`));
          });
      } else {
        this.logger.error('RTC Connection: Negotiation is needed but connection is not established');
      }
    };
  }

  public disconnect(): void {
    this.logger.info('Disconnecting an RTC connection.');
    this.rtcPeerConnection.close();
  }

  public addTrack(track: MediaStreamTrack): RTCRtpSender {
    this.logger.debug('Adding a stream track.');

    // We need to put all tracks in one stream if we want to synchronize them, for now - no.
    return this.rtcPeerConnection.addTrack(track, new MediaStream());
  }

  public removeTrack(track: MediaStreamTrack): void {
    this.logger.debug('Removing a stream track.');

    return this.rtcPeerConnection.getSenders()
      .filter(sender => sender.track === track)
      .forEach(t => this.rtcPeerConnection.removeTrack(t));
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

    return this.rtcPeerConnection.createAnswer(options || this.answerOptions)
      .then(this.setLocalDescription)
      .then(answer => this.artichokeApi.sendDescription(this.callId, this.peerId, answer).then(() => answer))
      .then((answer) => {
        this.logger.debug(`Sent an RTC answer: ${answer.sdp}`);

        return answer;
      });
  }

  public addAnswer(remoteDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Received an RTC answer.');

    return this.setRemoteDescription(remoteDescription);
  }

  public get remoteTrack$(): Observable<MediaStreamTrack> {
    return this.remoteTrackEvent;
  }

  private setRemoteDescription(remoteDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Setting remote RTC description.');

    return this.rtcPeerConnection.setRemoteDescription(remoteDescription).then(() => remoteDescription);
  }

  private setLocalDescription = (localDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
    this.logger.debug('Setting local RTC description.');

    return this.rtcPeerConnection.setLocalDescription(localDescription).then(() => localDescription);
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
}
