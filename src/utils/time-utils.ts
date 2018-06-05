// tslint:disable:no-unnecessary-class
export class TimeUtils {
  public static onceDelayed(timer: number, timeout: number, fun: () => void): number {
    window.clearTimeout(timer);

    return window.setTimeout(fun, timeout);
  }
}
