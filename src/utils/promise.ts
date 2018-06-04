import { errorEvents } from '../protocol/events/error-events';
import { DomainEvent } from '../protocol/events/domain-event';
import { Callback } from '../events/events';

export interface PromiseResolve<T> extends Callback<T | PromiseLike<T>> {
}

export interface PromiseReject extends Callback<errorEvents.Error> {
}

export interface PromiseFunctions {
    resolve: PromiseResolve<DomainEvent>;
    reject: PromiseReject;
}
