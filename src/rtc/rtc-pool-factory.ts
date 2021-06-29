import { RTCPool } from './rtc-pool';
import { ID } from '../protocol/protocol';
import { RTCConfig } from '../config/rtc-config';
import { LoggerFactory } from '../logger/logger-factory';
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { WebRTCStats } from './stats/webrtc-stats';
import { LoggerService } from '../logger/logger-service';
import { SignalingClient } from './signaling-client';

export class RTCPoolFactory {
    constructor(
        private rtcConfig: RTCConfig,
        private loggerFactory: LoggerFactory,
        private loggerService: LoggerService,
        private artichokeApi: ArtichokeApi,
        private webRTCStats: WebRTCStats,
    ) {
    }

    public create(callId: ID): RTCPool {
        this.loggerService.debug(`creating RTCPool for call ${callId}`);

        return new RTCPool(
            callId,
            this.rtcConfig,
            this.loggerFactory,
            new SignalingClient(callId, this.artichokeApi),
            this.webRTCStats
        );
    }
}
