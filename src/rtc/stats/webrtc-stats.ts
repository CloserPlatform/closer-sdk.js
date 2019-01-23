// tslint:disable:no-unsafe-any
import { CallstatsConfig } from '../../config/config';
import { LoggerFactory } from '../../logger/logger-factory';
import { LoggerService } from '../../logger/logger-service';
import { ID } from '../../protocol/protocol';
import { CallstatsApi, CSError } from './callstats-api';
import { NoopCollector } from './noop-collector';
import { CallstatsCollector, WebRTCStatsCollector } from './webrtc-stats-collector';

export class WebRTCStats {

  private callstats?: CallstatsApi;

  constructor(
    callstatsConfig: CallstatsConfig | undefined,
    private sessionId: ID,
    private logger: LoggerService,
    private loggerFactory: LoggerFactory,
  ) {
    if (!callstatsConfig) {
      this.logger.debug('Callstats not configured');

      return;
    }
    // tslint:disable-next-line:no-any
    const CallstatsWindowClass = (window as any).callstats;
    if (!CallstatsWindowClass) {
      this.logger.error('Callstats library not found - verify if callstats.min.js was loaded');

      return;
    }
    this.logger.debug('Initializing callstats');
    const callstats = new CallstatsWindowClass();
    callstats.initialize(
      callstatsConfig.appId,
      callstatsConfig.appSecret,
      this.sessionId,
      (csError: CSError, csErrMsg: string) =>
        this.logger.info(`Callstats initialization finished with ${csError} (${csErrMsg})`),
    );
    this.callstats = callstats;
  }

  public createCollector(
    rtcPeerConnection: RTCPeerConnection,
    callId: ID,
    peerId: ID,
  ): WebRTCStatsCollector {
    if (!this.callstats) {
      this.logger.debug('Callstats not configured, creating noop collector');

      return new NoopCollector();
    }
    this.logger.debug(`Initializing collector for call ${callId}`);

    return new CallstatsCollector(
      this.callstats,
      rtcPeerConnection,
      callId,
      this.loggerFactory.create(`WebRTCStatsCollector`),
      peerId,
    );
  }
}
