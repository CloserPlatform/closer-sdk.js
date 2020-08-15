import * as proto from '../protocol/protocol';
import { Call } from './call';
import { callEvents } from '../protocol/events/call-events';
import { CallType } from './call-type';
import * as wireEntities from '../protocol/wire-entities';
import { Observable } from 'rxjs';
import { LoggerService } from '../logger/logger-service';
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { RTCPool } from '../rtc/rtc-pool';
import { MediaTrackOptimizer } from '../rtc/media-track-optimizer';

export class GroupCall extends Call {
    public readonly callType: CallType = CallType.GROUP;

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

    public static isGroup(call: Call): call is GroupCall {
        return call.callType === CallType.GROUP;
    }

    public invite(user: proto.ID): Promise<void> {
        return this.artichokeApi.inviteToCall(this.id, user);
    }

    public join(tracks: ReadonlyArray<MediaStreamTrack>): Promise<void> {
        this.addTracks(tracks);

        return this.artichokeApi.joinCall(this.id);
    }

    public get invited$(): Observable<callEvents.Invited> {
        return this.getInvited$();
    }
}
