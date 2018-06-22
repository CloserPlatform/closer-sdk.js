import { errorEvents } from '../protocol/events/error-events';

export type Callback<T> = (arg: T) => void;

export interface PromiseResolve<T> extends Callback<T | PromiseLike<T>> {
}

export interface PromiseReject extends Callback<errorEvents.Error> {
}

export class PromiseUtils {

  public static wrapPromise<T, U>(promise: Promise<ReadonlyArray<T>>, fun: (arg: T) => U): Promise<ReadonlyArray<U>> {
    return promise.then((arr: ReadonlyArray<T>) => arr.map(fun));
  }
}
