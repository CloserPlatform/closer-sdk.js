import { SessionFactory } from '../../src/session/session-factory';
import { getLoggerFactoryMock } from '../mocks/logger.mock';
import { getConfigMock } from '../mocks/config.mock';

const sessionId = '111';
const apiKey = '888';
const config = getConfigMock();
const loggerFactory = getLoggerFactoryMock();

describe('SessionFactory', () => {
  it('create Session for correct input', () => {
    const sessionFactory = new SessionFactory(config, loggerFactory);
    const session = sessionFactory.create(sessionId, apiKey);

    expect(session.id).toBe(sessionId);
    expect(session.apiKey).toBe(apiKey);

    session.artichoke.connection$.subscribe();
  });
});
