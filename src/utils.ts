import * as adapter from "webrtc-adapter";

// Various utilities.

export interface Thunk {
  (): void;
}

export interface TransferFunction<T, U> {
  (arg: T): U;
}

export function wrapPromise<T, U>(promise: Promise<Array<T>>, fun: TransferFunction<T, U>): Promise<Array<U>> {
  return promise.then((obj: Array<T>) => obj.map(fun));
}

export function deepcopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)); // FIXME Deal with it.
}

export function isBrowserSupported(): boolean {
  return adapter.browserDetails.version !== null; // tslint:disable-line
}

export function isChrome() {
  return adapter.browserDetails.browser === "chrome";
}

export function isFirefox() {
  return adapter.browserDetails.browser === "firefox";
}

export function isEdge() {
  return adapter.browserDetails.browser === "edge";
}

export function isSafari() {
  return adapter.browserDetails.browser === "safari";
}

export function onceDelayed(timer: number, timeout: number, fun: () => void): number {
  clearTimeout(timer);
  return setTimeout(fun, timeout)
}
