// tslint:disable:max-file-line-count
import { DataChannel, DataChannelMessage } from './data-channel';
import { LoggerService } from '../logger/logger-service';
import { WebRTCStatsCollector } from './stats/webrtc-stats-collector';
import { Queue } from '../utils/queue';
import { WebRTCFunctions } from './stats/callstats.interface';

export class RTCPeerConnectionFacade {
  // Required to know when to drain ice candidates
  // tslint:disable-next-line:readonly-keyword
  private isRemoteSDPset = false;

  // Used to know which site should reconnect
  // tslint:disable-next-line:readonly-keyword
  private isOferrer = false;

  constructor(
    private rtcPeerConnection: RTCPeerConnection,
    private candidateQueue: Queue<RTCIceCandidateInit>,
    private logger: LoggerService,
    private dataChannel: DataChannel,
    private webrtcStatsCollector: WebRTCStatsCollector,
    private sendCandidate: (candidate: RTCIceCandidate) => void,
    private sendDescription: (description: RTCSessionDescriptionInit) => void,
    private onRemoteTrack: (track: MediaStreamTrack) => void,
    private onStatusChange: (status: RTCIceConnectionState) => void,
    private degradationPreference?: RTCDegradationPreference,
  ) {
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
      return this.addRTCIceCandidateInit(candidate);
    } else {
      return this.candidateQueue.add(candidate);
    }
  }

  public send(msg: DataChannelMessage): void {
    return this.dataChannel.send(msg);
  }

  public async replaceTrackByKind(track: MediaStreamTrack): Promise<void> {
    const maybeSender = this.rtcPeerConnection.getSenders()
      .filter(sender => sender.track && sender.track.kind === track.kind)[0];
    if (maybeSender) {
      this.logger.debug(`Sender found, replacing track with ${track.id}`);

      return maybeSender.replaceTrack(track);
    } else {
      return Promise.reject('ERROR Can not replace track, sender not found for old track');
    }
  }

  public async handleRemoteOffer(
    remoteDescription: RTCSessionDescriptionInit,
    options?: RTCAnswerOptions
  ): Promise<void> {
    this.logger.debug('Received an RTC offer - calling setRemoteDescription');

    return this.setRemoteDescription(remoteDescription)
      .catch((err?: DOMError) => {
        this.webrtcStatsCollector.reportError('setRemoteDescription', err);
        throw err;
      })
      .then(async _descr => {
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

  public async handleRemoteAnswer(remoteDescription: RTCSessionDescriptionInit): Promise<void> {
    this.logger.debug('Adding remote answer');

    return this.setRemoteDescription(remoteDescription)
      .then(_ => this.logger.debug('Successfully added SDP answer'))
      .catch(err => {
        this.logger.error(`Could not process the RTC description: ${err}`);
        this.handleFailedConnection();
        throw err;
      });
  }

  public async offer(options?: RTCOfferOptions): Promise<void> {
    this.logger.debug('Creating an RTC offer.');
    this.isOferrer = true;

    this.dataChannel.createConnection();

    return this.rtcPeerConnection.createOffer(options)
      .catch((err?: DOMError) => {
        this.webrtcStatsCollector.reportError('createOffer', err);
        throw err;
      })
      .then(offer => this.setLocalDescription(offer))
      .then(offer => {
        this.sendDescription(offer);
        this.logger.debug(`Sent an RTC offer: ${offer.sdp}`);
      })
      .catch(err => {
        this.logger.error(`Could not create an RTC offer: ${err}`);
        this.handleFailedConnection();
        throw err;
      });
  }

  private async answer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Creating an RTC answer.');

    this.dataChannel.createConnection();

    return this.rtcPeerConnection.createAnswer(options)
      .catch((err?: DOMError) => {
        this.webrtcStatsCollector.reportError('createAnswer', err);
        throw err;
      })
      // tslint:disable-next-line:cyclomatic-complexity
      .then(async answer => {
        this.logger.debug('Created an RTC answer');

        return this.setLocalDescription(answer);
      })
      .then(answer => {
        this.sendDescription(answer);
        this.logger.debug(`Sent an RTC answer: ${answer.sdp}`);

        return answer;
      });
  }

  private async setRemoteDescription(remoteDescription: RTCSessionDescriptionInit): Promise<void> {
    this.logger.debug('Setting remote RTC description.');

    return this.rtcPeerConnection.setRemoteDescription(remoteDescription)
      .then(() => this.drainCandidatesAfterSettingRemoteSDP());
  }

  private drainCandidatesAfterSettingRemoteSDP(): void {
    this.isRemoteSDPset = true;
    this.candidateQueue.drain().forEach(candidate => this.addRTCIceCandidateInit(candidate));
  }

  private addRTCIceCandidateInit(candidateInit: RTCIceCandidateInit): void {
    this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate(candidateInit))
      .then(() => this.logger.debug(`Candidate ${candidateInit} added`))
      .catch((err?: DOMError) => {
        this.logger.error('Could not add candidate: ', err);
        this.reportCallstatsError('addIceCandidate', err);
      });
  }

  private async setLocalDescription(localDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.logger.debug('Setting local RTC description.');

    return this.rtcPeerConnection.setLocalDescription(localDescription)
      .then(() => localDescription)
      .catch((err?: DOMError) => {
        this.reportCallstatsError('setLocalDescription', err);
        throw err;
      });
  }

  // tslint:disable-next-line:cyclomatic-complexity
  private onIceConnectionStateChange(connectionState: RTCIceConnectionState): void {
    if (connectionState === 'checking' && this.degradationPreference) {
      this.logger.debug('degradationPreference is enabled, configuring video senders');
      this.setVideoSendersDegradationPreference(this.degradationPreference);
    }
    if (connectionState === 'failed') {
      this.reportCallstatsError('iceConnectionFailure');
      if (this.isOferrer) {
        this.reconnect();
      }
    }
    this.onStatusChange(connectionState);
  }

  private reconnect(): void {
    this.logger.info('Reconnecting');
    this.offer({ iceRestart: true }).then(
      () => {
        this.logger.debug('Reconnected');
        this.registerRtcEvents();
      },
      err => this.logger.error('Reconnecting error', err)
    );
  }

  /**
   * Must be called after checking ice connection state,
   * If not, setParameters will fail because transactionId will be empty
   */
  private setVideoSendersDegradationPreference(degradationPreference: RTCDegradationPreference): void {
    try {
      this.rtcPeerConnection.getSenders().forEach(sender => {
        const rtpParams = sender.getParameters();
        const newRtpParams: RTCRtpParameters = { ...rtpParams, degradationPreference };
        sender.setParameters(newRtpParams)
          .then(() => this.logger.debug(`Applied degradationPreference ${degradationPreference} successfully`))
          .catch(err => this.logger.error(`Setting degradationPreference to ${degradationPreference} failed`, err));
      });
    } catch (e) {
      this.logger.warn('Optimizing video sender failed, check if your browsers supports RTCRtpSender.setParameters', e);
    }
  }

  private registerRtcEvents(): void {
    this.logger.debug('registering rtc events');
    this.rtcPeerConnection.onicecandidate = (event): void => {
      if (event.candidate) {
        this.logger.debug(`Created ICE candidate: ${event.candidate.candidate}`);
        this.sendCandidate(event.candidate);
        this.logger.debug('Candidate sent successfully');
      } else {
        this.logger.debug('Done gathering ICE candidates.');
      }
    };

    this.rtcPeerConnection.ontrack = (event: RTCTrackEvent): void => {
      const { track } = event;
      this.logger.info(`Received a remote track ${track.id}`);

      return this.onRemoteTrack(event.track);
    };

    this.rtcPeerConnection.onnegotiationneeded = (_event): void => {
      this.logger.debug('Negotiation needed');
      this.printRtcStates();
      this.logger.debug('Renegotiating');
      this.offer().then(
        () => this.logger.debug('Sending renegotiatin offer'),
        err => this.logger.error('Renegotiation offer failed', err)
      );
    };

    this.rtcPeerConnection.ondatachannel = (): void => {
      // Safari is incompatible, but creating data cahnnel on both sides works well.
      this.logger.debug('On DataChannel');
    };
    this.rtcPeerConnection.onicecandidateerror = (ev): void => {
      this.logger.error('ICE candidate ERROR', ev);
    };
    this.rtcPeerConnection.onconnectionstatechange = (): void => {
      // connectionState is supported only by Safari atm - 23.07.18
      const connectionState = this.rtcPeerConnection.connectionState;
      this.logger.debug(`Connection state change: ${connectionState}`);

      if (connectionState === 'failed') {
        this.reportCallstatsError('iceConnectionFailure');
        if (this.isOferrer) {
          this.reconnect();
        }
      }
    };
    this.rtcPeerConnection.oniceconnectionstatechange = (ev): void => {
      const { iceConnectionState } = this.rtcPeerConnection;
      this.logger.debug(`ICE connection state change: ${iceConnectionState}`, ev);
      this.onIceConnectionStateChange(iceConnectionState);
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

  private handleFailedConnection(): void {
    this.logger.warn('Connection failed, emitting failed & closing connection');
    this.onStatusChange('failed');
  }

  private reportCallstatsError(webRTCFunction: WebRTCFunctions, err?: DOMError): void {
    this.logger.debug(`Reporting ${webRTCFunction} error`);
    this.webrtcStatsCollector.reportError(webRTCFunction, err);
  }
}
