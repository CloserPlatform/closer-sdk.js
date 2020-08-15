
import { Delayer } from '../../../src/utils/delayer';

const getDelayer = () =>
  new Delayer();

describe('Delayer', () => {
  it('run once after timeout', done => {
    const delayer = getDelayer();
    const timeout = 1000;

    jasmine.clock().install();
    delayer.delayOnce(timeout, done);
    jasmine.clock().tick(timeout);
    jasmine.clock().uninstall();
  });

  it('not run before timeout', done => {
    const delayer = getDelayer();
    const timeout = 1000;

    jasmine.clock().install();
    delayer.delayOnce(timeout, done.fail);
    jasmine.clock().tick(timeout - 1);
    jasmine.clock().uninstall();
    done();
  });

  it('run once after timeout called twice', done => {
    const delayer = getDelayer();
    const timeout = 1000;

    jasmine.clock().install();
    delayer.delayOnce(timeout, done.fail);
    jasmine.clock().tick(timeout - 1);
    delayer.delayOnce(timeout, done);
    jasmine.clock().tick(timeout);
    jasmine.clock().uninstall();
  });
});
