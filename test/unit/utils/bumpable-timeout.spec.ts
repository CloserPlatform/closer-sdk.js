import { BumpableTimeout } from '../../../src/utils/bumpable-timeout';

describe('BumpableTimeout', () => {
  it('should fail if not bumped within given timeout', (done) => {
    jasmine.clock().install();

    const ms = 10;
    const bumpableTimeout = new BumpableTimeout(ms, done);

    jasmine.clock().tick(ms + 1);
    jasmine.clock().uninstall();

    return bumpableTimeout;
  });

  it('should not fail if bumped within given timeout', (done) => {
    jasmine.clock().install();

    const ms = 10;
    const bumpableTimeout = new BumpableTimeout(ms, (): void => done.fail());

    const interval = setInterval(() => bumpableTimeout.bump(), ms - 1);
    const tickMultiplier = 10;
    jasmine.clock().tick(ms * tickMultiplier);
    clearInterval(interval);
    done();
    jasmine.clock().uninstall();
  });

  it('should not fire timeout callback if cleared', (done) => {
    jasmine.clock().install();

    const ms = 10;
    const bumpableTimeout = new BumpableTimeout(ms, (): void => done.fail());

    setTimeout(() => bumpableTimeout.clear(), ms - 1);
    jasmine.clock().tick(ms + 1);
    done();

    jasmine.clock().uninstall();
  });
});
