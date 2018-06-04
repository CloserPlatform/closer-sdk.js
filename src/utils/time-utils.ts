// tslint:disable:no-unnecessary-class
export class TimeUtils {
  public static onceDelayed(timer: number, timeout: number, fun: () => void): number {
    clearTimeout(timer);

    return setTimeout(fun, timeout);
  }
}
