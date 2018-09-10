import { rtcEvents } from '../protocol/events/rtc-events';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { ID } from '../protocol/protocol';
import { RTCConfig } from './rtc-config';
import { ConnectionStatus, RTCPeerConnectionFacade } from './rtc-peer-connection-facade';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DataChannelMessage } from './data-channel';
import { LoggerFactory } from '../logger/logger-factory';
import { LoggerService } from '../logger/logger-service';

export interface RemoteTrack {
  peerId: ID;
  track: MediaStreamTrack;
}

export interface PeerDataChannelMessage {
  peerId: ID;
  message: DataChannelMessage;
}

export interface PeerConnectionStatus {
  peerId: ID;
  status: ConnectionStatus;
}

export class RTCPool {
  private offerOptions?: RTCOfferOptions;
  private answerOptions?: RTCAnswerOptions;

  private peerConnections: Map<ID, RTCPeerConnectionFacade> = new Map();
  private tracks: ReadonlyArray<MediaStreamTrack> = [];
  private remoteTrackEvent = new Subject<RemoteTrack>();
  private messageEvent = new Subject<PeerDataChannelMessage>();
  private connectionStatusEvent = new Subject<PeerConnectionStatus>();

  private logger: LoggerService;

  constructor(private callId: ID,
              private rtcConfig: RTCConfig,
              private loggerFactory: LoggerFactory,
              private artichokeApi: ArtichokeAPI) {

    this.logger = loggerFactory.create(`RTCPool(${callId})`);

    this.offerOptions = rtcConfig.defaultOfferOptions;
    this.answerOptions = rtcConfig.defaultAnswerOptions;

    // FIXME - unsubscribe
    this.descriptionSent$.subscribe(this.listenForDescriptionSent);
    // FIXME - unsubscribe
    this.candidateSent$.subscribe(this.listenForCandidateSent);
  }

  public get message$(): Observable<PeerDataChannelMessage> {
    return this.messageEvent;
  }

  public get peerStatus$(): Observable<PeerConnectionStatus> {
    return this.connectionStatusEvent;
  }

  public get remoteTrack$(): Observable<RemoteTrack> {
    return this.remoteTrackEvent;
  }

  public broadcast = (msg: DataChannelMessage): void =>
    this.peerConnections.forEach(peerConnection => peerConnection.send(msg))

  public addTrack(track: MediaStreamTrack): void {
    this.tracks = [...this.tracks, track];
    this.peerConnections.forEach(peerConnection => peerConnection.addTrack(track));
  }

  public removeTrack(track: MediaStreamTrack): void {
    this.tracks = this.tracks.filter((t) => t !== track);
    this.peerConnections.forEach(peerConnection => peerConnection.removeTrack(track));
  }

  public connect(peerId: ID): void {
    return this.getRTCPeerConnectionInstance(peerId).connect(this.offerOptions);
  }

  public destroyConnection(peerId: ID): void {
    const maybePeerConnection = this.peerConnections.get(peerId);
    if (maybePeerConnection) {
      this.logger.debug(`Destroying connection for peerId ${peerId}`);
      maybePeerConnection.disconnect();
      this.peerConnections.delete(peerId);
    } else {
      this.logger.warn(`Cannot destroy connection for peerId ${peerId} - it does not exist`);
    }
  }

  public destroyAllConnections = (): void => {
    this.logger.debug(`Destroying all connections`);
    this.peerConnections.forEach((_, peerId) => this.destroyConnection(peerId));
  }

  public setAnswerOptions(options: RTCAnswerOptions): void {
    this.answerOptions = options;
  }

  public setOfferOptions(options: RTCOfferOptions): void {
    this.offerOptions = options;
  }

  public replaceTrackByKind(track: MediaStreamTrack): Promise<void> {
    return Promise.all(
      Array.from(this.peerConnections)
        .map(peerIdPeerConnectionPair => peerIdPeerConnectionPair[1])
        .map(peerConnection => peerConnection.replaceTrackByKind(track))
    )
      .then(_ => undefined);
  }

  private listenForDescriptionSent = (msg: rtcEvents.DescriptionSent): void => {
    this.logger.debug(`Received an RTC description: ${msg.sdp.type} ${msg.sdp.sdp}`);
    switch (msg.sdp.type) {
      case 'offer':
        return this.getRTCPeerConnectionInstance(msg.sender).handleRemoteOffer(msg.sdp, this.answerOptions);
      case 'answer':
        return this.getRTCPeerConnectionInstance(msg.sender).handleRemoteAnswer(msg.sdp);
      default:
        return this.logger.error(`Received an invalid RTC description type ${msg.sdp.type}`);
    }
  }

  private listenForCandidateSent = (msg: rtcEvents.CandidateSent): void => {
    this.logger.debug(`Received an RTC candidate: ${msg.candidate}`);
    this.getRTCPeerConnectionInstance(msg.sender).addCandidate(msg.candidate);
  }

  private get descriptionSent$(): Observable<rtcEvents.DescriptionSent> {
    return this.getRtcPoolEvent().pipe(filter(rtcEvents.DescriptionSent.is));
  }

  private get candidateSent$(): Observable<rtcEvents.CandidateSent> {
    return this.getRtcPoolEvent().pipe(filter(rtcEvents.CandidateSent.is));
  }

  private getRtcPoolEvent = (): Observable<rtcEvents.RTCSignallingEvent> =>
    this.artichokeApi.event$
      .pipe(filter(rtcEvents.RTCSignallingEvent.is))
      .pipe(filter(e => e.callId === this.callId))

  private getRTCPeerConnectionInstance = (peerId: ID): RTCPeerConnectionFacade => {
    const maybeRTCPeerConnection = this.peerConnections.get(peerId);
    if (maybeRTCPeerConnection) {
      this.logger.debug(`RTCPeerConnectionFacade exists for peer ${peerId} - returning `);

      return maybeRTCPeerConnection;
    } else {
      this.logger.debug(`RTCPeerConnectionFacade not exists for peer ${peerId} - creating new`);
      const rtcConnection = this.createRTCConnectionFacade(peerId);
      this.peerConnections.set(peerId, rtcConnection);

      return rtcConnection;
    }
  }

  private getTrackEventHandler = (peerId: ID): (track: MediaStreamTrack) => void =>
    (track: MediaStreamTrack): void => this.remoteTrackEvent.next({peerId, track})

  private getDataChannelEventHandler = (peerId: ID): (message: DataChannelMessage) => void =>
    (message: DataChannelMessage): void => this.messageEvent.next({peerId, message})

  private getConnectionStatusEventHandler = (peerId: ID): (status: ConnectionStatus) => void =>
    (status: ConnectionStatus): void => this.connectionStatusEvent.next({peerId, status})

  private createRTCConnectionFacade(peerId: ID): RTCPeerConnectionFacade {
    this.logger.debug(`Creating new RTCConnection for peerId: ${peerId}`);

    return new RTCPeerConnectionFacade(this.callId, peerId, this.rtcConfig, this.loggerFactory,
      this.artichokeApi,
      this.getTrackEventHandler(peerId),
      this.getConnectionStatusEventHandler(peerId),
      this.getDataChannelEventHandler(peerId),
      this.tracks,
      this.answerOptions, this.offerOptions);
  }
}
