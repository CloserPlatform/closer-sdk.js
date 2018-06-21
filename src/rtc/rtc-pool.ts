import { Logger } from '../logger';
import { errorEvents } from '../protocol/events/error-events';
import { rtcEvents } from '../protocol/events/rtc-events';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { ID } from '../protocol/protocol';
import { EventHandler } from '../events/event-handler';
import { RTCConfig } from './rtc-config';
import { RTCConnection } from './rtc-connection';

interface MediaStreamAndTrack {
  track: MediaStreamTrack;
  stream?: MediaStream;
}

export type RemoteStreamCallback = (peer: ID, stream: MediaStream) => void;

export class RTCPool {
  private offerOptions?: RTCOfferOptions;
  private answerOptions?: RTCAnswerOptions;

  private peerConnections: { [peerId: string]: RTCConnection } = {};
  private tracks: ReadonlyArray<MediaStreamAndTrack> = [];
  private onRemoteStreamCallback: RemoteStreamCallback;

  constructor(private callId: ID,
              private rtcConfig: RTCConfig,
              private logger: Logger,
              private eventHandler: EventHandler,
              private artichokeApi: ArtichokeAPI) {

    this.offerOptions = rtcConfig.defaultOfferOptions;
    this.answerOptions = rtcConfig.defaultAnswerOptions;

    this.onRemoteStreamCallback = (_peer, _stream): void => {
      this.logger.warn('Event onRemoteStream received but not handled!');
    };

    eventHandler.onConcreteEvent(rtcEvents.DescriptionSent.tag, this.callId, 'singleton',
      (msg: rtcEvents.DescriptionSent) => {
        this.logger.debug(`Received an RTC description: ${msg.sdp.sdp}`);

        if (msg.sdp.type === 'offer') {
          if (msg.sender in this.peerConnections) {
            this.peerConnections[msg.sender].addOffer(msg.sdp).catch((err) => {
              eventHandler.notify(new errorEvents.Error(`Could not process the RTC description: ${err}`));
            });
          } else {
            const rtc = this.createRTC(msg.sender);
            rtc.addOffer(msg.sdp).catch((err) => {
              eventHandler.notify(new errorEvents.Error(`Could not process the RTC description: ${err}`));
            });
          }
        } else if (msg.sdp.type === 'answer') {
          if (msg.sender in this.peerConnections) {
            this.peerConnections[msg.sender].addAnswer(msg.sdp).catch((err) => {
              eventHandler.notify(new errorEvents.Error(`Could not process the RTC description: ${err}`));
            });
          } else {
            eventHandler.notify(new errorEvents.Error(`Received an invalid RTC answer from ${msg.sender}`));
          }
        } else {
          eventHandler.notify(new errorEvents.Error(`Received an invalid RTC description type ${msg.sdp.type}`));
        }
      });

    eventHandler.onConcreteEvent(rtcEvents.CandidateSent.tag, this.callId, 'singleton',
      (msg: rtcEvents.CandidateSent) => {
        this.logger.debug(`Received an RTC candidate: ${msg.candidate}`);
        if (msg.sender in this.peerConnections) {
          this.peerConnections[msg.sender].addCandidate(msg.candidate).catch((err) => {
            eventHandler.notify(new errorEvents.Error(`Could not process the RTC candidate: ${err}`));
          });
        } else {
          eventHandler.notify(new errorEvents.Error(
            `Received an invalid RTC candidate. ${msg.sender} is not currently in this call.`));
        }
      });
  }

  public onRemoteStream(callback: RemoteStreamCallback): void {
    this.onRemoteStreamCallback = callback;
  }

  public addTrack(track: MediaStreamTrack, stream?: MediaStream): void {
    const newTrackObj = {
      track,
      stream
    };
    this.tracks = [...this.tracks, newTrackObj];
    Object.keys(this.peerConnections).forEach(peerId => {
      this.peerConnections[peerId].addTrack(track, stream);
    });
  }

  public removeTrack(track: MediaStreamTrack): void {
    this.tracks = this.tracks.filter((t) => t.track !== track);
    Object.keys(this.peerConnections).forEach(peerId => {
      this.peerConnections[peerId].removeTrack(track);
    });
  }

  public create(peer: ID): RTCConnection {
    const rtc = this.createRTC(peer);
    rtc.offer(this.offerOptions).catch(err => {
      this.eventHandler.notify(new errorEvents.Error(`Could not create an RTC offer: ${err}`));
    });

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

  private createRTC(peerId: ID): RTCConnection {
    const rtcConnection = new RTCConnection(this.callId, peerId, this.rtcConfig, this.logger, this.eventHandler,
      this.artichokeApi, this.answerOptions, this.offerOptions);
    rtcConnection.onRemoteStream((s) => this.onRemoteStreamCallback(peerId, s));
    this.peerConnections[peerId] = rtcConnection;
    this.tracks.forEach((t) => rtcConnection.addTrack(t.track, t.stream));

    return rtcConnection;
  }
}
