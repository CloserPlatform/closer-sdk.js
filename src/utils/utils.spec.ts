import { PromiseUtils } from './promise-utils';
import { ObjectUtils } from './object-utils';
import { BrowserUtils } from './browser-utils';
import { TimeUtils } from './time-utils';
import { BumpableTimeout } from './bumpable-timeout';

describe('Utils', () => {
  it('wrapPromise should replace a Promise', (done) => {
    const fun = (i: number): string => i.toString();

    PromiseUtils.wrapPromise(Promise.resolve([23]), fun).then((i) => {
      expect(i).toEqual(['23']);
      done();
    }).catch((error) => done.fail());

    PromiseUtils.wrapPromise(Promise.reject<Array<number>>('nope'), fun).then((i) => done.fail()).catch((error) => {
      expect(error).toEqual('nope');
      done();
    });
  });

  it('wrapPromise should reject if an error appears in mapping', (done) => {
    PromiseUtils.wrapPromise(Promise.resolve([23]), (i: number) => {
      throw Error('error!');
    }).then((i) => done.fail()).catch((error) => done());
  });

  it('deepcopy should perform a deep copy', () => {
    const obj = {
      foo: 23,
      bar: {
        baz: 5
      }
    };

    const cpy = ObjectUtils.deepcopy(obj) as typeof obj;
    expect(cpy).toEqual(obj);

    obj.bar.baz = 42;
    expect(cpy.bar.baz).toEqual(5);
  });

  it('isBrowserSupported should check if browser is supported', () => {
    if (BrowserUtils.isChrome()) {
      expect(BrowserUtils.isBrowserSupported()).toEqual(true);
    } else if (BrowserUtils.isFirefox()) {
      expect(BrowserUtils.isBrowserSupported()).toEqual(true);
    }
  });

  it('onceDelayed should only execute once', (done) => {
    let timer: number;
    timer = TimeUtils.onceDelayed(timer, 50, () => {
      done.fail();
    });
    timer = TimeUtils.onceDelayed(timer, 100, () => {
      done();
    });
  });

  it('BumpableTimeout should fail if not bumped within given timeout', (done) => {
    jasmine.clock().install();

    const ms = 10;
    const bumpableTimeout = new BumpableTimeout(ms, done);

    jasmine.clock().tick(ms + 1);
    jasmine.clock().uninstall();
  });

  it('BumpableTimeout should not fail if bumped within given timeout', (done) => {
    jasmine.clock().install();

    const ms = 10;
    const bumpableTimeout = new BumpableTimeout(ms, (): void => done.fail());

    const interval = setInterval(() => bumpableTimeout.bump(), ms - 1);
    jasmine.clock().tick(ms * 10);
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
