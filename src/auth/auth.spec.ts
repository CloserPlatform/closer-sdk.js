import { withApiKey } from './auth';
import { config } from '../test-utils';

describe('Authorization', () => {
  it('should authorize with API key', (done) => {
    withApiKey('12345', '54321', config).then((session) => {
      expect(session.id).toBe('12345');
      expect(session.chat).toBeDefined();
      done();
    }).catch((_error) => done.fail());
  });
});
