import * as adapter from "webrtc-adapter";

// Various utilities.

export interface Thunk {
  (): void;
}

export interface TransferFunction<T, U> {
  (arg: T): U;
}

export function wrapPromise<T, U>(promise: Promise<T | Array<T>>, fun: TransferFunction<T, U>): Promise<U | Array<U>> {
  return promise.then(function(obj) {
    if (Array.isArray(obj)) {
      return (obj as Array<T>).map(fun);
    } else {
      return fun(obj as T);
    }
  });
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
