import * as adapter from 'webrtc-adapter';

// Various utilities.

export type Thunk = () => void;

export type TransferFunction<T, U> = (arg: T) => U;

export function wrapPromise<T, U>(promise: Promise<Array<T>>, fun: TransferFunction<T, U>): Promise<Array<U>> {
  return promise.then((obj: Array<T>) => obj.map(fun));
}

export function deepcopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)); // FIXME Deal with it.
}

export function isBrowserSupported(): boolean {
  return adapter.browserDetails.version !== null; // tslint:disable-line
}

export function isChrome(): boolean {
  return adapter.browserDetails.browser === 'chrome';
}

export function isFirefox(): boolean {
  return adapter.browserDetails.browser === 'firefox';
}

export function isEdge(): boolean {
  return adapter.browserDetails.browser === 'edge';
}

export function isSafari(): boolean {
  return adapter.browserDetails.browser === 'safari';
}

export function onceDelayed(timer: number, timeout: number, fun: () => void): number {
  clearTimeout(timer);

  return setTimeout(fun, timeout);
}

export type UUID = string;

export function randomUUID(): UUID {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0; // tslint:disable-line
    const v = c === 'x' ? r : (r & 0x3 | 0x8); // tslint:disable-line

    return v.toString(16);
  });
}

export class BumpableTimeout {
  private readonly timeout_ms: number;
  private readonly onTimeoutClb: () => void;
  private timeoutId: number;

  constructor(timeout_ms: number, onTimeoutClb: () => void) {
    this.timeout_ms = timeout_ms;
    this.onTimeoutClb = onTimeoutClb;

    this.bump();
  }

  public bump(): void {
    this.clear();
    this.timeoutId = setTimeout(this.onTimeoutClb, this.timeout_ms);
  }

  public clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}
