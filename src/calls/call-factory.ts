import * as wireEntities from '../protocol/wire-entities';
import { Logger } from '../logger';
import { Call } from './call';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { DirectCall } from './direct-call';
import { BusinessCall } from './business-call';
import { GroupCall } from './group-call';
import { RTCPoolRepository } from '../rtc/rtc-pool-repository';

export class CallFactory {

  constructor(private logger: Logger,
              private artichokeAPI: ArtichokeAPI,
              private rtcPoolRepository: RTCPoolRepository) {}

  public create = (call: wireEntities.Call,
                stream?: MediaStream): Call => {
    if (call.direct) {
      return new DirectCall(call, this.logger, this.artichokeAPI, this.rtcPoolRepository, stream);
    } else if (call.orgId) {
      return new BusinessCall(call, this.logger, this.artichokeAPI, this.rtcPoolRepository, stream);
    } else {
      return new GroupCall(call, this.logger, this.artichokeAPI, this.rtcPoolRepository, stream);
    }
  }
}
