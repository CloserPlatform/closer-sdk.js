import { errorEvents } from '../protocol/events/error-events';
import { Callback } from '../events/event-handler';

export interface PromiseResolve<T> extends Callback<T | PromiseLike<T>> {
}

export interface PromiseReject extends Callback<errorEvents.Error> {
}

export interface PromiseFunctions<T> {
    resolve: PromiseResolve<T>;
    reject: PromiseReject;
}

// tslint:disable:no-unnecessary-class
export class PromiseUtils {

  public static wrapPromise<T, U>(promise: Promise<ReadonlyArray<T>>, fun: (arg: T) => U): Promise<ReadonlyArray<U>> {
    return promise.then((arr: ReadonlyArray<T>) => arr.map(fun));
  }
}
