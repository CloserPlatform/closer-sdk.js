import * as wireEntities from '../protocol/wire-entities';
import { Call } from './call';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { DirectCall } from './direct-call';
import { BusinessCall } from './business-call';
import { GroupCall } from './group-call';
import { RTCPoolRepository } from '../rtc/rtc-pool-repository';
import { LoggerFactory } from '../logger/logger-factory';

export class CallFactory {

  constructor(private loggerFactory: LoggerFactory,
              private artichokeAPI: ArtichokeAPI,
              private rtcPoolRepository: RTCPoolRepository) {
  }

  public create = (call: wireEntities.Call,
                   tracks?: ReadonlyArray<MediaStreamTrack>): Call => {
    if (call.direct) {
      return this.createDirectCall(call, tracks);
    } else if (call.orgId) {
      return this.createBusinessCall(call, tracks);
    } else {
      return this.createGroupCall(call, tracks);
    }
  }

  private createDirectCall = (call: wireEntities.Call, tracks?: ReadonlyArray<MediaStreamTrack>): DirectCall =>
    new DirectCall(call, this.loggerFactory.create(`DirectCall(${call.id})`), this.artichokeAPI,
      this.rtcPoolRepository, tracks)

  private createBusinessCall = (call: wireEntities.Call, tracks?: ReadonlyArray<MediaStreamTrack>): BusinessCall =>
    new BusinessCall(call, this.loggerFactory.create(`BusinessCall(${call.id})`), this.artichokeAPI,
      this.rtcPoolRepository, tracks)

  private createGroupCall = (call: wireEntities.Call, tracks?: ReadonlyArray<MediaStreamTrack>): GroupCall =>
    new GroupCall(call, this.loggerFactory.create(`GroupCall(${call.id})`), this.artichokeAPI,
      this.rtcPoolRepository, tracks)
}
