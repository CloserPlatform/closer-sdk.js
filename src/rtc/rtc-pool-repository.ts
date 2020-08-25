import { RTCPool } from './rtc-pool';
import * as proto from '../protocol/protocol';
import { LoggerService } from '../logger/logger-service';
import { RTCPoolFactory } from './rtc-pool-factory';

export class RTCPoolRepository {

  // tslint:disable-next-line:readonly-keyword
  private rtcPools: { [callId: string]: RTCPool } = {};

  constructor(
    private loggerService: LoggerService,
    private rtcPoolFactory: RTCPoolFactory
  ) {
  }

  public getRtcPoolInstance(callId: proto.ID): RTCPool {
    const rtcPool = this.rtcPools[callId];

    if (!rtcPool) {
      this.loggerService.debug(`creating RTCPool for call ${callId}`);
      this.rtcPools[callId] = this.rtcPoolFactory.create(callId);
    }

    return this.rtcPools[callId];
  }
}
