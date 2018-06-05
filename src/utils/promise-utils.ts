import { errorEvents } from '../protocol/events/error-events';
import { DomainEvent } from '../protocol/events/domain-event';
import { Callback } from '../events/event-handler';

export interface PromiseResolve<T> extends Callback<T | PromiseLike<T>> {
}

export interface PromiseReject extends Callback<errorEvents.Error> {
}

export interface PromiseFunctions {
    resolve: PromiseResolve<DomainEvent>;
    reject: PromiseReject;
}

// tslint:disable:no-unnecessary-class
export class PromiseUtils {

  public static wrapPromise<T, U>(promise: Promise<T[]>, fun: (arg: T) => U): Promise<U[]> {
    return promise.then((arr: T[]) => arr.map(fun));
  }
}
