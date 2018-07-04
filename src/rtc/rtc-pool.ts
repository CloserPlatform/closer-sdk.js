import { Logger } from '../logger';
import { rtcEvents } from '../protocol/events/rtc-events';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { ID } from '../protocol/protocol';
import { RTCConfig } from './rtc-config';
import { RTCConnection } from './rtc-connection';
import { Observable, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface RemoteTrack {
  peerId: ID;
  track: MediaStreamTrack;
}

export class RTCPool {
  private offerOptions?: RTCOfferOptions;
  private answerOptions?: RTCAnswerOptions;

  private peerConnections: { [peerId: string]: RTCConnection } = {};
  private tracks: ReadonlyArray<MediaStreamTrack> = [];
  private remoteTrackEvent = new Subject<RemoteTrack>();
  private rtcCallEvent = new Subject<rtcEvents.RTCSignallingEvent>();

  constructor(private callId: ID,
              private rtcConfig: RTCConfig,
              private logger: Logger,
              private artichokeApi: ArtichokeAPI) {

    this.offerOptions = rtcConfig.defaultOfferOptions;
    this.answerOptions = rtcConfig.defaultAnswerOptions;

    // FIXME - unsubscribe
    this.artichokeApi.event$
      .pipe(filter(rtcEvents.RTCSignallingEvent.is))
      .pipe(filter(e => e.callId === this.callId))
      .subscribe(ev => this.rtcCallEvent.next(ev));

    this.listenForDescriptionSent();
    this.listenForCandidateSent();
  }

  public get remoteTrack$(): Observable<RemoteTrack> {
    return this.remoteTrackEvent;
  }

  public addTrack(track: MediaStreamTrack): void {
    this.tracks = [...this.tracks, track];
    Object.keys(this.peerConnections).forEach(peerId => {
      this.peerConnections[peerId].addTrack(track);
    });
  }

  public removeTrack(track: MediaStreamTrack): void {
    this.tracks = this.tracks.filter((t) => t !== track);
    Object.keys(this.peerConnections).forEach(peerId => {
      this.peerConnections[peerId].removeTrack(track);
    });
  }

  public create(peerId: ID): RTCConnection {
    const rtc = this.createRTCConnection(peerId);
    rtc.offer(this.offerOptions).catch(err => this.logger.error(`Could not create an RTC offer: ${err}`));

    return rtc;
  }

  public destroyConnection(peerId: ID): void {
    if (peerId in this.peerConnections) {
      this.peerConnections[peerId].disconnect();
      const {[peerId]: value, ...withoutPeerConnection} = this.peerConnections;
      this.peerConnections = withoutPeerConnection;
    }
  }

  public destroyAllConnections(): void {
    Object.keys(this.peerConnections).forEach(peerId => this.destroyConnection(peerId));
  }

  public setAnswerOptions(options: RTCAnswerOptions): void {
    this.answerOptions = options;
  }

  public setOfferOptions(options: RTCOfferOptions): void {
    this.offerOptions = options;
  }

  private listenForDescriptionSent = (): Subscription =>
    // FIXME - unsubscribe
    this.descriptionSent$.subscribe(msg => {
      this.logger.debug(`Received an RTC description: ${msg.sdp.type} ${msg.sdp.sdp}`);

      if (msg.sdp.type === 'offer') {
        this.logger.debug('Received SDP offer');
        if (msg.sender in this.peerConnections) {
          this.peerConnections[msg.sender].addOffer(msg.sdp)
            .then(_ => this.logger.debug('Successfully added SDP offer to existing RTCConnection'))
            .catch(err => this.logger.error(`Could not process the RTC description: ${err}`));
        } else {
          const rtc = this.createRTCConnection(msg.sender);
          rtc.addOffer(msg.sdp)
            .then(_ => this.logger.debug('Successfully added SDP offer to new RTCConeection'))
            .catch(err => this.logger.error(`Could not process the RTC description: ${err}`));
        }
      } else if (msg.sdp.type === 'answer') {
        if (msg.sender in this.peerConnections) {
          this.peerConnections[msg.sender].addAnswer(msg.sdp)
            .then(_ => this.logger.debug('Successfully added SDP answer'))
            .catch(err => this.logger.error(`Could not process the RTC description: ${err}`));
        } else {
          this.logger.error(`Received an invalid RTC answer from ${msg.sender}`);
        }
      } else {
        this.logger.error(`Received an invalid RTC description type ${msg.sdp.type}`);
      }
    })

  private listenForCandidateSent = (): Subscription =>
    // FIXME - unsubscribe
    this.candidateSent$.subscribe(msg => {
      this.logger.debug(`Received an RTC candidate: ${msg.candidate}`);
      if (msg.sender in this.peerConnections) {
        this.peerConnections[msg.sender].addCandidate(msg.candidate)
          .then(_ => this.logger.debug('Candidate successfully added'))
          .catch((err) => this.logger.error(`Could not process the RTC candidate: ${err}`));
      } else {
        this.logger.error(`Received an invalid RTC candidate. ${msg.sender} is not currently in this call.`);
      }
    })

  private get descriptionSent$(): Observable<rtcEvents.DescriptionSent> {
    return this.rtcCallEvent.pipe(filter(rtcEvents.DescriptionSent.is));
  }

  private get candidateSent$(): Observable<rtcEvents.CandidateSent> {
    return this.rtcCallEvent.pipe(filter(rtcEvents.CandidateSent.is));
  }

  private createRTCConnection(peerId: ID): RTCConnection {
    this.logger.debug(`Creating new RTCConnection for peerId: ${peerId}`);

    const rtcConnection = new RTCConnection(this.callId, peerId, this.rtcConfig, this.logger,
      this.artichokeApi, this.answerOptions, this.offerOptions);

    // FIXME - unsubscribe
    rtcConnection.remoteTrack$.subscribe(track => this.remoteTrackEvent.next({peerId, track}));

    this.peerConnections[peerId] = rtcConnection;
    this.tracks.forEach((t) => rtcConnection.addTrack(t));

    return rtcConnection;
  }
}
