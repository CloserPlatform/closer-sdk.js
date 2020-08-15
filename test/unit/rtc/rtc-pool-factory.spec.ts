import { getConfigMock } from '../../mocks/config.mock';
import { getLoggerFactoryMock, getLoggerServiceMock } from '../../mocks/logger.mock';
import { getArtichokeApiMock } from '../../mocks/artichoke-api.mock';
import { getWebrtcStatsMock } from '../../mocks/webrtc-stats.mock';
import { RTCPoolFactory } from '../../../src/rtc/rtc-pool-factory';

export const getRTCPoolFactory = (): RTCPoolFactory =>
    new RTCPoolFactory(
        getConfigMock().rtc,
        getLoggerFactoryMock(),
        getLoggerServiceMock(),
        getArtichokeApiMock(),
        getWebrtcStatsMock()
    );

describe('RTCPoolFactory', () => {
    it('create new pool', () => {
        const poolFactory = getRTCPoolFactory();
        const callId = 'callId';
        const pool = poolFactory.create(callId);
        expect(pool.callId).toBe(callId);
    });
});
