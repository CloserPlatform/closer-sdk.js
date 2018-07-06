import { PromiseUtils } from './promise-utils';
import { ObjectUtils } from './object-utils';
import { TimeUtils } from './time-utils';
import { BumpableTimeout } from './bumpable-timeout';
const testVal = 23;
describe('Utils', () => {
  it('wrapPromise should replace a Promise', (done) => {
    const fun = (i: number): string => i.toString();
    PromiseUtils.wrapPromise(Promise.resolve([testVal]), fun).then((i) => {
      expect(i).toEqual(['23']);
      done();
    }).catch((_error) => done.fail());

    PromiseUtils.wrapPromise(Promise.reject<ReadonlyArray<number>>('nope'), fun)
      .then((_i) => done.fail()).catch((error) => {
      expect(error).toEqual('nope');
      done();
    });
  });

  it('wrapPromise should reject if an error appears in mapping', (done) => {
    PromiseUtils.wrapPromise(Promise.resolve([testVal]), (_i: number) => {
      throw Error('error!');
    }).then((_i) => done.fail()).catch((_error) => done());
  });

  it('deepcopy should perform a deep copy', () => {
    const testVal2 = 5;
    const obj = {
      foo: 23,
      bar: {
        baz: testVal2
      }
    };

    const testVal3 = 42;

    const cpy = ObjectUtils.deepcopy(obj) as typeof obj;
    expect(cpy).toEqual(obj);

    obj.bar.baz = testVal3;
    expect(cpy.bar.baz).toEqual(testVal2);
  });

  it('onceDelayed should only execute once', (done) => {
    const smallerTimeout = 50;
    const timer = TimeUtils.onceDelayed(0, smallerTimeout, () => {
      done.fail();
    });
    const biggerTimeout = 100;
    TimeUtils.onceDelayed(timer, biggerTimeout, () => {
      done();
    });
  });

  it('BumpableTimeout should fail if not bumped within given timeout', (done) => {
    jasmine.clock().install();

    const ms = 10;
    const bumpableTimeout = new BumpableTimeout(ms, done);

    jasmine.clock().tick(ms + 1);
    jasmine.clock().uninstall();

    return bumpableTimeout;
  });

  it('BumpableTimeout should not fail if bumped within given timeout', (done) => {
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

  it('BumpableTimeout should not fire timeout callback if cleared', (done) => {
    jasmine.clock().install();

    const ms = 10;
    const bumpableTimeout = new BumpableTimeout(ms, (): void => done.fail());

    setTimeout(() => bumpableTimeout.clear(), ms - 1);
    jasmine.clock().tick(ms + 1);
    done();

    jasmine.clock().uninstall();
  });
});
