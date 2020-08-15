import { SessionFactory } from '../../src/session/session-factory';
import { getLoggerFactoryMock } from '../mocks/logger.mock';
import { getConfigMock } from '../mocks/config.mock';

const sessionId = '111';
const apiKey = '888';
const config = getConfigMock();
const loggerFactory = getLoggerFactoryMock();

describe('SessionFactory', () => {
  it('create Session for correct input', () => {
    const sessionFactory = new SessionFactory(sessionId, apiKey, config, loggerFactory);
    const session = sessionFactory.create();

    expect(session.id).toBe(sessionId);
    expect(session.artichoke).toBeDefined();

    session.artichoke.connection$.subscribe();
  });
});
