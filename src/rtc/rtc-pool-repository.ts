import { Logger } from '../logger';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { RTCConfig } from './rtc-config';
import { RTCPool } from './rtc-pool';
import * as proto from '../protocol/protocol';

export class RTCPoolRepository {

  private rtcPools: {[callId: string]: RTCPool} = {};

  constructor(private rtcConfig: RTCConfig,
              private logger: Logger,
              private artichokeApi: ArtichokeAPI) {
  }

  public getRtcPoolInstance = (callId: proto.ID): RTCPool => {
    const rtcPool = this.rtcPools[callId];

    if (!rtcPool) {
      this.rtcPools[callId] = new RTCPool(callId, this.rtcConfig, this.logger, this.artichokeApi);
    }

    return this.rtcPools[callId];
  }
}
