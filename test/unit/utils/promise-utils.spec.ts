import { PromiseUtils } from '../../../src/utils/promise-utils';

const testVal = 23;
const testFun = (i: number): string => i.toString();

describe('PromiseUtils', () => {

  it('wrapPromise should replace a Promise', done => {
    PromiseUtils.wrapPromise(
      Promise.resolve([testVal]),
      testFun
    ).then(i => {
      expect(i).toEqual([String(testVal)]);
      done();
    }).catch(done.fail);
  });

  it('wrapPromise should work with Promise reject', done => {
    PromiseUtils.wrapPromise(
      Promise.reject<ReadonlyArray<number>>('nope'),
      testFun,
    ).then(
      () => done.fail()
    ).catch(
      error => {
        expect(error).toEqual('nope');
        done();
      }
     );
  });

  it('wrapPromise should reject if an error appears in mapping', async () => {

    const promise = PromiseUtils.wrapPromise(
      Promise.resolve(
        [testVal]),
      () => {
        throw Error('error!');
      }
    );

    await expectAsync(promise).toBeRejected();
  });
});
