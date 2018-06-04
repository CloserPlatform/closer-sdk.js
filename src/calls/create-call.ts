import * as wireEntities from '../protocol/wire-entities';
import { Logger } from '../logger';
import { EventHandler } from '../events/event-handler';
import { Call } from './call';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { DirectCall } from './direct-call';
import { BusinessCall } from './business-call';
import { GroupCall } from './group-call';
import { RTCConfig } from '../rtc/rtc-config';

export function createCall(call: wireEntities.Call, config: RTCConfig, log: Logger, events: EventHandler,
                           api: ArtichokeAPI, stream?: MediaStream): Call {
    if (call.direct) {
        return new DirectCall(call, config, log, events, api, stream);
    } else if (call.orgId) {
        return new BusinessCall(call, config, log, events, api, stream);
    } else {
        return new GroupCall(call, config, log, events, api, stream);
    }
}
