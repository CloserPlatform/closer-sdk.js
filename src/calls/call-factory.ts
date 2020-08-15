import * as wireEntities from '../protocol/wire-entities';
import { Call } from './call';
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { DirectCall } from './direct-call';
import { BusinessCall } from './business-call';
import { GroupCall } from './group-call';
import { RTCPoolRepository } from '../rtc/rtc-pool-repository';
import { LoggerFactory } from '../logger/logger-factory';
import { RTCPool } from '../rtc/rtc-pool';
import { MediaTrackOptimizer } from '../rtc/media-track-optimizer';

export class CallFactory {

  constructor(
    private loggerFactory: LoggerFactory,
    private artichokeAPI: ArtichokeApi,
    private rtcPoolRepository: RTCPoolRepository,
    private mediaTrackOptimizer: MediaTrackOptimizer
  ) {
  }

  public create(call: wireEntities.Call,
    tracks?: ReadonlyArray<MediaStreamTrack>): Call {
    const pool = this.rtcPoolRepository.getRtcPoolInstance(call.id);
    if (call.direct) {
      return this.createDirectCall(call, pool, tracks);
    } else if (call.orgId) {
      return this.createBusinessCall(call, pool, tracks);
    } else {
      return this.createGroupCall(call, pool, tracks);
    }
  }

  private createDirectCall(
    call: wireEntities.Call,
    pool: RTCPool,
    tracks?: ReadonlyArray<MediaStreamTrack>
  ): DirectCall {
    return new DirectCall(call, this.loggerFactory.create(`DirectCall(${call.id})`), this.mediaTrackOptimizer,
    this.artichokeAPI, pool, tracks);
  }

  private createBusinessCall(
    call: wireEntities.Call,
    pool: RTCPool,
    tracks?: ReadonlyArray<MediaStreamTrack>,
  ): BusinessCall {
    return new BusinessCall(call, this.loggerFactory.create(`BusinessCall(${call.id})`),
    this.mediaTrackOptimizer, this.artichokeAPI, pool, tracks);
  }

  private createGroupCall(
    call: wireEntities.Call,
    pool: RTCPool,
    tracks?: ReadonlyArray<MediaStreamTrack>,
  ): GroupCall {
    return new GroupCall(call, this.loggerFactory.create(`GroupCall(${call.id})`), this.mediaTrackOptimizer,
    this.artichokeAPI, pool, tracks);
  }
}
