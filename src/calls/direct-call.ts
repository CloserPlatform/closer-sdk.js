import { Call } from './call';
import * as wireEntities from '../protocol/wire-entities';
import { CallType } from './call-type';
import { LoggerService } from '../logger/logger-service';
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { RTCPool } from '../rtc/rtc-pool';
import { MediaTrackOptimizer } from '../rtc/media-track-optimizer';

export class DirectCall extends Call {
    public readonly callType: CallType = CallType.DIRECT;

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

    public static isDirect(call: Call): call is DirectCall {
        return call.callType === CallType.DIRECT;
    }
}
