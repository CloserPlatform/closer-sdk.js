import { RTCPool } from '../../src/rtc/rtc-pool';
import { getArtichokeApiMock } from './artichoke-api.mock';
import { getWebrtcStatsMock } from './webrtc-stats.mock';
import { getConfigMock } from './config.mock';
import { getLoggerFactoryMock } from './logger.mock';

export const getRTCPool = (
    callId = 'callId'
): RTCPool =>
    new RTCPool(
        callId,
        getConfigMock().rtc,
        getLoggerFactoryMock(),
        getArtichokeApiMock(),
        getWebrtcStatsMock()
    );
