// tslint:disable:max-file-line-count
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { ID } from '../protocol/protocol';
import { DataChannel, DataChannelMessage } from './data-channel';
import { LoggerService } from '../logger/logger-service';
import { WebRTCStats } from './stats/webrtc-stats';
import { WebRTCStatsCollector } from './stats/webrtc-stats-collector';
import { NoopCollector } from './stats/noop-collector';
import { Delayer } from '../utils/delayer';
import { Queue } from '../utils/queue';

export enum ConnectionStatus {
  Failed,
  Connected,
  Disconnected
}

export class RTCPeerConnectionFacade {
  public static readonly renegotiationTimeout = 100;

  private statsCollector: WebRTCStatsCollector = new NoopCollector();

  // FIXME Required by the various hacks:
  private isRemoteSDPset = false;
  private dtlsRole: 'active' | 'passive';

  constructor(
    private callId: ID,
    private peerId: ID,
    private rtcPeerConnection: RTCPeerConnection,
    private artichokeApi: ArtichokeApi,
    private onRemoteTrack: (track: MediaStreamTrack) => void,
    private onStatusChange: (status: ConnectionStatus) => void,
    private candidateQueue: Queue<RTCIceCandidateInit>,
    private logger: LoggerService,
    private dataChannel: DataChannel,
    private delayer: Delayer,
    initialMediaTracks: ReadonlyArray<MediaStreamTrack>,
    webrtcStats: WebRTCStats,
  ) {
    this.statsCollector = webrtcStats.createCollector(this.rtcPeerConnection, callId, peerId);
    initialMediaTracks.forEach(track => this.addTrack(track));
    this.registerRtcEvents();
  }

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
        .catch((err?: DOMError) => {
          this.logger.error('Could not add candidate: ', err);
          this.statsCollector.reportError('addIceCandidate', err);
        });
    } else {
      this.candidateQueue.add(candidate);
    }
  }

  public send(msg: DataChannelMessage): void {
    return this.dataChannel.send(msg);
  }

  public replaceTrackByKind(track: MediaStreamTrack): Promise<void> {
    const maybeSender = this.rtcPeerConnection.getSenders()
      .filter(sender => sender.track && sender.track.kind === track.kind)[0];
    if (maybeSender) {
      this.logger.debug(`Sender found, replacing track with ${track.id}`);

      return maybeSender.replaceTrack(track);
    } else {
      return Promise.reject('ERROR Can not replace track, sender not found for old track');
    }
  }

  public handleRemoteOffer(remoteDescription: RTCSessionDescriptionInit, options?: RTCAnswerOptions): Promise<void> {
    this.logger.debug('Received an RTC offer - calling setRemoteDescription');

    return this.setRemoteDescription(remoteDescription)
      .catch((err?: DOMError) => {
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
        throw err;
      });
  }

  public handleRemoteAnswer(remoteDescription: RTCSessionDescriptionInit): Promise<void> {
    if (!this.dtlsRole && remoteDescription.sdp) {
      this.logger.debug('Detecting DTLS role based on remote answer');
      this.dtlsRole = remoteDescription.sdp.includes('a=setup:active') ? 'passive' : 'active';
      this.logger.debug(`Detected DTLS role: ${this.dtlsRole}`);
    }

    this.logger.debug('Adding remote answer');

    return this.setRemoteDescription(remoteDescription)
      .then(_ => this.logger.debug('Successfully added SDP answer'))
      .catch(err => {
        this.logger.error(`Could not process the RTC description: ${err}`);
        this.handleFailedConnection();
        throw err;
      });
  }

  public offer(options?: RTCOfferOptions): Promise<void> {
    this.logger.debug('Creating an RTC offer.');

    this.dataChannel.createConnection();

    return this.rtcPeerConnection.createOffer(options)
      .catch((err?: DOMError) => {
        this.statsCollector.reportError('createOffer', err);
        throw err;
      })
      .then(offer => this.setLocalDescription(offer))
      .then(offer => {
        this.artichokeApi.sendDescription(this.callId, this.peerId, offer);
        this.logger.debug(`Sent an RTC offer: ${offer.sdp}`);
      })
      .catch(err => {
        this.logger.error(`Could not create an RTC offer: ${err}`);
        this.handleFailedConnection();
        throw err;
      });
  }

  private answer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Creating an RTC answer.');

    this.dataChannel.createConnection();

    return this.rtcPeerConnection.createAnswer(options)
      .catch((err?: DOMError) => {
        this.statsCollector.reportError('createAnswer', err);
        throw err;
      })
      .then(answer => {
        this.logger.debug('Created an RTC answer');

        if (!this.dtlsRole && answer.sdp) {
          this.logger.debug('Detecting DTLS role based on created answer');
          this.dtlsRole = answer.sdp.includes('a=setup:active') ? 'active' : 'passive';
          this.logger.debug(`Detected DTLS role: ${this.dtlsRole}`);
        }
        this.patchSDPAnswer(answer);

        return this.setLocalDescription(answer);
      })
      .then(answer => {
        this.artichokeApi.sendDescription(this.callId, this.peerId, answer);
        this.logger.debug(`Sent an RTC answer: ${answer.sdp}`);

        return answer;
      });
  }

  private patchSDPAnswer(answer: RTCSessionDescriptionInit): void {
    if (this.dtlsRole === 'passive' && answer.sdp && answer.sdp.includes('a=setup:active')) {
      this.logger.info('DTLS role mismatch detected, patching SDP answer');
      answer.sdp = answer.sdp.replace(/a=setup:active/g, 'a=setup:passive');
    }
  }

  private setRemoteDescription(remoteDescription: RTCSessionDescriptionInit): Promise<void> {
    this.logger.debug('Setting remote RTC description.');

    return this.rtcPeerConnection.setRemoteDescription(remoteDescription)
      .then(() => this.drainCandidatesAfterSettingRemoteSDP());
  }

  private drainCandidatesAfterSettingRemoteSDP(): void {
    this.isRemoteSDPset = true;
    this.candidateQueue.drain().forEach(candidate =>
      this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        .catch((err?: DOMError) => {
          this.logger.error('Could not add candidate: ', err);
          this.statsCollector.reportError('addIceCandidate', err);
        }));
  }

  private setLocalDescription(localDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Setting local RTC description.');

    return this.rtcPeerConnection.setLocalDescription(localDescription)
      .then(() => localDescription)
      .catch((err?: DOMError) => {
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

  private registerRtcEvents(): void {
    this.logger.debug('registering rtc events');
    this.rtcPeerConnection.onicecandidate = (event): void => {
      if (event.candidate) {
        this.logger.debug(`Created ICE candidate: ${event.candidate.candidate}`);
        this.artichokeApi.sendCandidate(this.callId, this.peerId, event.candidate);
        this.logger.debug('Candidate sent successfully');
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
      if (this.isEstablished()) {
        this.delayer.delayOnce(RTCPeerConnectionFacade.renegotiationTimeout, () => {
            this.logger.debug('Renegotiating');
            this.offer().then(
              () => this.logger.debug('Sending renegotiatin offer'),
              err => this.logger.error('Renegotiation offer failed', err)
            );
          });
      } else {
        this.logger.debug('onnegotiationneeded - connection not established - doing nothing');
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

  private printRtcStates(): void {
    this.logger.debug(`Connection state: ${this.rtcPeerConnection.connectionState}`);
    this.logger.debug(`Signaling state: ${this.rtcPeerConnection.signalingState}`);
    this.logger.debug(`ICE Connection state: ${this.rtcPeerConnection.iceConnectionState}`);
    this.logger.debug(`ICE Gathering state: ${this.rtcPeerConnection.iceGatheringState}`);
  }

  private notifyStatusChange(iceConnectionState: RTCIceConnectionState): void {
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

  private handleFailedConnection(): void {
    this.logger.warn('Connection failed, emitting failed & closing connection');
    this.onStatusChange(ConnectionStatus.Failed);
  }
}
