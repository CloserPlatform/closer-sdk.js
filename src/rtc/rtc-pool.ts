import { rtcEvents } from '../protocol/events/rtc-events';
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { ID } from '../protocol/protocol';
import { ConnectionStatus, RTCPeerConnectionFacade } from './rtc-peer-connection-facade';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DataChannelMessage, DataChannel } from './data-channel';
import { LoggerFactory } from '../logger/logger-factory';
import { LoggerService } from '../logger/logger-service';
import { WebRTCStats } from './stats/webrtc-stats';
import { Queue } from '../utils/queue';
import { Delayer } from '../utils/delayer';

export interface RemoteTrack {
  readonly peerId: ID;
  readonly track: MediaStreamTrack;
}

export interface PeerDataChannelMessage {
  readonly peerId: ID;
  readonly message: DataChannelMessage;
}

export interface PeerConnectionStatus {
  readonly peerId: ID;
  readonly status: ConnectionStatus;
}

export class RTCPool {
  private readonly peerConnections: Map<ID, RTCPeerConnectionFacade> = new Map();
  // tslint:disable-next-line:readonly-keyword
  private tracks: ReadonlyArray<MediaStreamTrack> = [];
  private readonly remoteTrackEvent = new Subject<RemoteTrack>();
  private readonly messageEvent = new Subject<PeerDataChannelMessage>();
  private readonly connectionStatusEvent = new Subject<PeerConnectionStatus>();

  private readonly logger: LoggerService;

  constructor(
    public readonly callId: ID,
    private rtcConfig: RTCConfiguration,
    private loggerFactory: LoggerFactory,
    private artichokeApi: ArtichokeApi,
    private webrtcStats: WebRTCStats
  ) {

    this.logger = loggerFactory.create(`RTCPool(${callId})`);

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

  // tslint:disable-next-line:readonly-keyword
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

  public async connect(peerId: ID): Promise<void> {
    return this.getRTCPeerConnectionInstance(peerId).offer();
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

  public destroyAllConnections(): void {
    this.logger.debug(`Destroying all connections`);
    this.peerConnections.forEach((_, peerId) => this.destroyConnection(peerId));
  }

  public async replaceTrackByKind(track: MediaStreamTrack): Promise<void> {
    return Promise.all(
      Array.from(this.peerConnections)
        .map(peerIdPeerConnectionPair => peerIdPeerConnectionPair[1])
        .map(peerConnection => peerConnection.replaceTrackByKind(track))
    )
      .then(_ => undefined);
  }

  // tslint:disable-next-line:readonly-keyword
  private listenForDescriptionSent = async (msg: rtcEvents.DescriptionSent): Promise<void> => {
    this.logger.debug(`Received an RTC description: ${msg.sdp.type} ${msg.sdp.sdp}`);
    switch (msg.sdp.type) {
      case 'offer':
        return this.getRTCPeerConnectionInstance(msg.sender).handleRemoteOffer(msg.sdp);
      case 'answer':
        return this.getRTCPeerConnectionInstance(msg.sender).handleRemoteAnswer(msg.sdp);
      default:
        const error = `Received an invalid RTC description type ${msg.sdp.type}`;
        this.logger.error(error);

        return Promise.reject(error);
    }
  }

  // tslint:disable-next-line:readonly-keyword
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

  // tslint:disable-next-line:readonly-keyword
  private getRtcPoolEvent = (): Observable<rtcEvents.RTCSignallingEvent> =>
    this.artichokeApi.domainEvent$
      .pipe(filter(rtcEvents.RTCSignallingEvent.is))
      .pipe(filter(e => e.callId === this.callId))

  // tslint:disable-next-line:readonly-keyword
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

  // tslint:disable-next-line:readonly-keyword
  private getTrackEventHandler = (peerId: ID): (track: MediaStreamTrack) => void =>
    (track: MediaStreamTrack): void => this.remoteTrackEvent.next({ peerId, track })

  // tslint:disable-next-line:readonly-keyword
  private getDataChannelEventHandler = (peerId: ID): (message: DataChannelMessage) => void =>
    (message: DataChannelMessage): void => this.messageEvent.next({ peerId, message })

  // tslint:disable-next-line:readonly-keyword
  private getConnectionStatusEventHandler = (peerId: ID): (status: ConnectionStatus) => void =>
    (status: ConnectionStatus): void => this.connectionStatusEvent.next({ peerId, status })

  private createRTCConnectionFacade(peerId: ID): RTCPeerConnectionFacade {
    this.logger.debug(`Creating new RTCConnection for peerId: ${peerId}`);
    const peerCandidateQueueLogger = this.loggerFactory.create(`PeerCandidateQueue Peer(${peerId})`);

    const rtcPeerConnection = new RTCPeerConnection(this.rtcConfig);
    const dataChannel = new DataChannel(
      this.callId,
      this.getDataChannelEventHandler(peerId),
      rtcPeerConnection,
      this.loggerFactory.create(`DataChannel label(${this.callId})`),
      new Queue<DataChannelMessage>(this.loggerFactory.create('Queue<DataChannelMessage>'))
    );

    return new RTCPeerConnectionFacade(
      this.callId, peerId, rtcPeerConnection,
      this.artichokeApi,
      this.getTrackEventHandler(peerId),
      this.getConnectionStatusEventHandler(peerId),
      new Queue<RTCIceCandidateInit>(peerCandidateQueueLogger),
      this.loggerFactory.create(`RTCPeerConnectionFacade Call(${this.callId}) Peer(${peerId})`),
      dataChannel,
      new Delayer(),
      this.tracks,
      this.webrtcStats
    );
  }
}
