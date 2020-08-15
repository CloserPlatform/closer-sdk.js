import { RTCPool } from './rtc-pool';
import { protocol } from '..';
import { RTCConfig } from '../config/rtc-config';
import { LoggerFactory } from '../logger/logger-factory';
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { WebRTCStats } from './stats/webrtc-stats';
import { LoggerService } from '../logger/logger-service';

export class RTCPoolFactory {
    constructor(
        private rtcConfig: RTCConfig,
        private loggerFactory: LoggerFactory,
        private loggerService: LoggerService,
        private artichokeApi: ArtichokeApi,
        private webRTCStats: WebRTCStats,
    ) {
    }

    public create(callId: protocol.ID): RTCPool {
        this.loggerService.debug(`creating RTCPool for call ${callId}`);

        return new RTCPool(
            callId,
            this.rtcConfig,
            this.loggerFactory,
            this.artichokeApi,
            this.webRTCStats
        );
    }
}
