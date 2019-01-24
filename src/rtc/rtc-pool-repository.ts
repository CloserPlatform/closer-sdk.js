import { ArtichokeAPI } from '../apis/artichoke-api';
import { RTCConfig } from './rtc-config';
import { RTCPool } from './rtc-pool';
import * as proto from '../protocol/protocol';
import { LoggerFactory } from '../logger/logger-factory';
import { LoggerService } from '../logger/logger-service';
import { WebRTCStats } from './stats/webrtc-stats';

export class RTCPoolRepository {

  private rtcPools: {[callId: string]: RTCPool} = {};

  private logger: LoggerService;

  constructor(private rtcConfig: RTCConfig,
              private loggerFactory: LoggerFactory,
              private artichokeApi: ArtichokeAPI,
              private webrtcStats: WebRTCStats) {
    this.logger = loggerFactory.create('RTCPoolRepository');
  }

  public getRtcPoolInstance = (callId: proto.ID): RTCPool => {
    const rtcPool = this.rtcPools[callId];

    if (!rtcPool) {
      this.logger.debug(`creating RTCPool for call ${callId}`);
      this.rtcPools[callId] = new RTCPool(
        callId,
        this.rtcConfig,
        this.loggerFactory,
        this.artichokeApi,
        this.webrtcStats
      );
    }

    return this.rtcPools[callId];
  }
}
