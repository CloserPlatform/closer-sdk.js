// tslint:disable:max-file-line-count
import { ArtichokeAPI } from '../apis/artichoke-api';
import { ID } from '../protocol/protocol';
import { RTCConfig } from './rtc-config';
import { TimeUtils } from '../utils/time-utils';
import { DataChannel, DataChannelMessage } from './data-channel';
import { LoggerFactory } from '../logger/logger-factory';
import { LoggerService } from '../logger/logger-service';
import { PeerCandidateQueue } from './peer-candidate-queue';
import { WebRTCStats } from './stats/webrtc-stats';
import { WebRTCStatsCollector } from './stats/webrtc-stats-collector';
import { NoopCollector } from './stats/noop-collector';

export enum ConnectionStatus {
  Failed,
  Connected,
  Disconnected
}

export class RTCPeerConnectionFacade {
  public static readonly renegotiationTimeout = 100;

  private rtcPeerConnection: RTCPeerConnection;
  private dataChannel: DataChannel;

  private statsCollector: WebRTCStatsCollector = new NoopCollector();

  // FIXME Required by the various hacks:
  private renegotiationTimer: number;
  private isRemoteSDPset = false;

  private logger: LoggerService;

  private candidateQueue: PeerCandidateQueue;

  constructor(private callId: ID, private peerId: ID, private config: RTCConfig,
              loggerFactory: LoggerFactory,
              private artichokeApi: ArtichokeAPI,
              private onRemoteTrack: (track: MediaStreamTrack) => void,
              private onStatusChange: (status: ConnectionStatus) => void,
              onDataChannelMessage: (msg: DataChannelMessage) => void,
              initialMediaTracks: ReadonlyArray<MediaStreamTrack>,
              webrtcStats: WebRTCStats,
              private answerOptions?: RTCAnswerOptions,
              private offerOptions?: RTCOfferOptions) {
    this.logger = loggerFactory.create(`RTCPeerConnectionFacade Call(${callId}) Peer(${peerId})`);
    this.logger.info('Creating the connection');
    this.rtcPeerConnection = new RTCPeerConnection(config);
    this.statsCollector = webrtcStats.createCollector(this.rtcPeerConnection, callId, peerId);
    initialMediaTracks.forEach(track => this.addTrack(track));
    this.dataChannel = new DataChannel(callId, this.rtcPeerConnection, onDataChannelMessage, loggerFactory);
    this.candidateQueue = new PeerCandidateQueue(callId, loggerFactory);
    this.registerRtcEvents();
  }

  public connect = (offerOptons?: RTCOfferOptions): void =>
    this.offer(offerOptons)

  public disconnect(): void {
    this.logger.info('Disconnecting');

    return this.rtcPeerConnection.close();
  }

  public addTrack(track: MediaStreamTrack): void {
    this.logger.debug(`Adding a ${track.kind} media track`);
    // Because sometimes camera might fail when adding video track
    // This `try` will still create the correct connection just with audio
    try {
      this.rtcPeerConnection.addTrack(track, new MediaStream());
    } catch (err) {
      this.logger.error(`Adding media tracks failed with: ${err}`);
    }
  }

  public removeTrack(track: MediaStreamTrack): void {
    this.logger.debug(`Removing a ${track.kind} media track with id ${track.id}`);

    return this.rtcPeerConnection.getSenders()
      .filter(sender => sender.track === track)
      .forEach(sender => this.rtcPeerConnection.removeTrack(sender));
  }

  public addCandidate(candidate: RTCIceCandidate): void {
    this.logger.debug(`Received an RTC candidate: ${candidate.candidate}`);

    if (this.isRemoteSDPset) {
      this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit))
        .then(_ => this.logger.debug('Candidate successfully added'))
        .catch(err => {
          this.logger.error('Could not add candidate: ', err);
          this.statsCollector.reportError('addIceCandidate', err);
        });
    } else {
      this.candidateQueue.addCandidate(candidate);
    }
  }

  public send(msg: DataChannelMessage): void {
    return this.dataChannel.send(msg);
  }

  public replaceTrackByKind = (track: MediaStreamTrack): Promise<void> => {
    const maybeSender = this.rtcPeerConnection.getSenders()
      .filter(sender => sender.track && sender.track.kind === track.kind)[0];
    if (maybeSender) {
      this.logger.debug(`Sender found, replacing track with ${track.id}`);

      return maybeSender.replaceTrack(track);
    } else {
      return Promise.reject('ERROR Can not replace track, sender not found for old track');
    }
  }

  public handleRemoteOffer = (remoteDescription: RTCSessionDescriptionInit,
                              options?: RTCAnswerOptions): void => {
    this.logger.debug('Received an RTC offer - calling setRemoteDescription');

    this.setRemoteDescription(remoteDescription)
      .catch(err => {
        this.statsCollector.reportError('setRemoteDescription', err);
        throw err;
      })
      .then(_descr => {
        this.logger.debug('RTC offer was successfully set');

        return this.answer(options);
      })
      .then(_ => this.logger.debug('Successfully added SDP offer to RTCConnection'))
      .catch(err => {
        this.logger.error(`Could not process the RTC description: ${err}`);
        this.handleFailedConnection();
      });
  }

  public handleRemoteAnswer(remoteDescription: RTCSessionDescriptionInit): void {
    this.logger.debug('Adding remote answer');

    this.setRemoteDescription(remoteDescription)
      .then(_ => this.logger.debug('Successfully added SDP answer'))
      .catch(err => {
        this.logger.error(`Could not process the RTC description: ${err}`);
        this.handleFailedConnection();
      });
  }

  private offer(options?: RTCOfferOptions): void {
    this.logger.debug('Creating an RTC offer.');

    this.dataChannel.createConnection();

    this.rtcPeerConnection.createOffer(options || this.offerOptions)
      .catch(err => {
        this.statsCollector.reportError('createOffer', err);
        throw err;
      })
      .then(offer => this.setLocalDescription(offer))
      .then(offer => this.artichokeApi.sendDescription(this.callId, this.peerId, offer).then(_ => offer))
      .then(offer => {
        this.logger.debug(`Sent an RTC offer: ${offer.sdp}`);

        return offer;
      })
      .catch(err => {
        this.logger.error(`Could not create an RTC offer: ${err}`);
        this.handleFailedConnection();
      });
  }

  private answer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Creating an RTC answer.');

    this.dataChannel.createConnection();

    return this.rtcPeerConnection.createAnswer(options || this.answerOptions)
      .catch(err => {
        this.statsCollector.reportError('createAnswer', err);
        throw err;
      })
      .then(answer => {
        this.logger.debug('Created an RTC answer');

        return this.setLocalDescription(answer);
      })
      .then(answer => this.artichokeApi.sendDescription(this.callId, this.peerId, answer).then(_ => answer))
      .then(answer => {
        this.logger.debug(`Sent an RTC answer: ${answer.sdp}`);

        return answer;
      });
  }

  private setRemoteDescription = (remoteDescription: RTCSessionDescriptionInit): Promise<void> => {
    this.logger.debug('Setting remote RTC description.');

    return this.rtcPeerConnection.setRemoteDescription(remoteDescription)
      .then(this.drainCandidatesAfterSettingRemoteSDP);
  }

  private drainCandidatesAfterSettingRemoteSDP = (): void => {
    this.isRemoteSDPset = true;
    this.candidateQueue.drainCandidates().forEach(candidate =>
      this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit))
        .catch(err => {
          this.logger.error('Could not add candidate: ', err);
          this.statsCollector.reportError('addIceCandidate', err);
        }));
  }

  private setLocalDescription = (localDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
    this.logger.debug('Setting local RTC description.');

    return this.rtcPeerConnection.setLocalDescription(localDescription)
      .then(() => localDescription)
      .catch((err) => {
        this.statsCollector.reportError('setLocalDescription', err);
        throw err;
      });
  }

  private isEstablished(): boolean {
    // NOTE 'stable' means no exchange is going on, which encompases 'fresh'
    // NOTE RTC connections as well as established ones.
    if (typeof this.rtcPeerConnection.connectionState !== 'undefined') {
      return this.rtcPeerConnection.connectionState === 'connected'; // Supported only by Safari
    } else {
      // FIXME Firefox does not support connectionState: https://bugzilla.mozilla.org/show_bug.cgi?id=1265827
      return this.rtcPeerConnection.signalingState === 'stable' &&
        (this.rtcPeerConnection.iceConnectionState === 'connected' ||
          this.rtcPeerConnection.iceConnectionState === 'completed');
    }
  }

  private registerRtcEvents = (): void => {
    this.logger.debug('registering rtc events');
    this.rtcPeerConnection.onicecandidate = (event): void => {
      if (event.candidate) {
        this.logger.debug(`Created ICE candidate: ${event.candidate.candidate}`);
        this.artichokeApi.sendCandidate(this.callId, this.peerId, event.candidate)
          .then(_ => this.logger.debug('Candidate sent successfully'))
          .catch(err => this.logger.error(`Could not send an ICE candidate: ${err}`));
      } else {
        this.logger.debug('Done gathering ICE candidates.');
      }
    };

    this.rtcPeerConnection.ontrack = (event: RTCTrackEvent): void => {
      const track = event.track;
      this.logger.info(`Received a remote track ${track.id}`);

      return this.onRemoteTrack(event.track);
    };

    this.rtcPeerConnection.onnegotiationneeded = (_event): void => {
      this.logger.debug('Negotiation needed');
      this.printRtcStates();
      // FIXME Chrome triggers renegotiation on... Initial offer creation...
      // FIXME Firefox triggers renegotiation when remote offer is received.
      if (!this.config.negotiationNeededDisabled) {
        if (this.isEstablished()) {
          this.renegotiationTimer = TimeUtils.onceDelayed(
            this.renegotiationTimer, RTCPeerConnectionFacade.renegotiationTimeout, () => {
              this.logger.debug('Renegotiating');
              this.offer();
            });
        } else {
          this.logger.debug('onnegotiationneeded - connection not established - doing nothing');
        }
      } else {
        this.logger.info('negotitationneeded was called but it is disabled');
      }
    };

    this.rtcPeerConnection.ondatachannel = (): void => {
      this.logger.debug('On DataChannel');
    };
    this.rtcPeerConnection.onicecandidateerror = (ev): void => {
      this.logger.error('ICE candidate ERROR', ev);
    };
    this.rtcPeerConnection.onconnectionstatechange = (): void => {
      // connectionState is supported only by Safari atm - 23.07.18
      this.logger.debug(`Connection state change: ${this.rtcPeerConnection.connectionState}`);
    };
    this.rtcPeerConnection.oniceconnectionstatechange = (ev): void => {
      this.logger.debug(`ICE connection state change: ${this.rtcPeerConnection.iceConnectionState}`, ev);
      this.notifyStatusChange(this.rtcPeerConnection.iceConnectionState);
    };
    this.rtcPeerConnection.onicegatheringstatechange = (ev): void => {
      this.logger.debug(`ICE gathering state change: ${this.rtcPeerConnection.iceGatheringState}`, ev);
    };
    this.rtcPeerConnection.onsignalingstatechange = (ev): void => {
      this.logger.debug(`Siganling state change: ${this.rtcPeerConnection.signalingState}`, ev);
    };
    this.logger.debug('Registered all rtc events');
  }

  private printRtcStates = (): void => {
    this.logger.debug(`Connection state: ${this.rtcPeerConnection.connectionState}`);
    this.logger.debug(`Signaling state: ${this.rtcPeerConnection.signalingState}`);
    this.logger.debug(`ICE Connection state: ${this.rtcPeerConnection.iceConnectionState}`);
    this.logger.debug(`ICE Gathering state: ${this.rtcPeerConnection.iceGatheringState}`);
  }

  private notifyStatusChange = (iceConnectionState: RTCIceConnectionState): void => {
    switch (iceConnectionState) {
      case 'failed':
        this.statsCollector.reportError('iceConnectionFailure');

        return this.onStatusChange(ConnectionStatus.Failed);
      case 'connected':
        return this.onStatusChange(ConnectionStatus.Connected);
      case 'closed': // it is end - can not reconnect
        return this.onStatusChange(ConnectionStatus.Disconnected);
      case 'disconnected': // but can reconnect
        return this.onStatusChange(ConnectionStatus.Disconnected);
      default:
    }
  }

  private handleFailedConnection = (): void => {
    this.logger.warn('Connection failed, emitting failed & closing connection');
    this.onStatusChange(ConnectionStatus.Failed);
  }
}
