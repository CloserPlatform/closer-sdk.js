import { GroupCall } from './group-call';
import { Call } from './call';
import { CallType } from './call-type';
import { LoggerService } from '../logger/logger-service';
import * as wireEntities from '../protocol/wire-entities';
import { RTCPool } from '../rtc/rtc-pool';
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { MediaTrackOptimizer } from '../rtc/media-track-optimizer';

export class BusinessCall extends GroupCall {
    public readonly callType: CallType = CallType.BUSINESS;

    constructor(
        call: wireEntities.Call,
        logger: LoggerService,
        mediaTrackOptimizer: MediaTrackOptimizer,
        artichokeApi: ArtichokeApi,
        pool: RTCPool,
        tracks?: ReadonlyArray<MediaStreamTrack>
    ) {
        super(call, logger, mediaTrackOptimizer, artichokeApi, pool, tracks);
    }

    public static isBusiness(call: Call): call is BusinessCall {
        return call.callType === CallType.BUSINESS;
    }
}
