import { getRTCPoolFactory } from './rtc-pool-factory.spec';
import { RTCPoolRepository } from '../../../src/rtc/rtc-pool-repository';
import { getLoggerServiceMock } from '../../mocks/logger.mock';
import { getRTCPool } from '../../mocks/rtc-pool';

export const getRTCPoolRepository = (poolFactory = getRTCPoolFactory()): RTCPoolRepository =>
    new RTCPoolRepository(
        getLoggerServiceMock(),
        poolFactory
    );

describe('RTCPoolRepository', () => {
    it('create new pool', () => {
        const poolFactory = getRTCPoolFactory();
        const poolRepository = getRTCPoolRepository(poolFactory);
        const callId = 'callId';
        const mockedPool = getRTCPool(callId);
        spyOn(poolFactory, 'create').and.returnValue(mockedPool);

        const repoPool = poolRepository.getRtcPoolInstance(callId);

        expect(repoPool).toBe(mockedPool);
    });

    it('return existing pool for the second request', () => {
        const poolFactory = getRTCPoolFactory();
        const poolRepository = getRTCPoolRepository(poolFactory);
        const callId = 'callId';
        const mockedPool = getRTCPool(callId);
        spyOn(poolFactory, 'create').and.returnValue(mockedPool);

        const repoPool = poolRepository.getRtcPoolInstance(callId);
        const repoPool2 = poolRepository.getRtcPoolInstance(callId);

        expect(repoPool).toBe(mockedPool);
        expect(repoPool2).toBe(mockedPool);
    });

    it('return new pool for the second request', () => {
        const poolFactory = getRTCPoolFactory();
        const poolRepository = getRTCPoolRepository(poolFactory);

        const callId = 'callId';
        const callId2 = 'callId2';

        const mockedPool = getRTCPool(callId);
        const mockedPool2 = getRTCPool(callId2);

        spyOn(poolFactory, 'create').and.callFake(getRTCPool);

        const repoPool = poolRepository.getRtcPoolInstance(callId);
        const repoPool2 = poolRepository.getRtcPoolInstance(callId2);

        expect(repoPool.callId).toBe(mockedPool.callId);
        expect(repoPool2.callId).toBe(mockedPool2.callId);
    });
});
