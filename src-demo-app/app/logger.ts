// tslint:disable:no-any
// tslint:disable:no-console
// tslint:disable:no-unnecessary-class
// tslint:disable:readonly-array

export class Logger {
  public static error = (...args: any[]): void => {
    console.error(args);
  }

  public static log = (...args: any[]): void => {
    console.log(args);
  }
}
