export class Logger {
  public static error(...args: any[]): void {
    console.error(args);
  }

  public static log(...args: any[]): void {
    console.log(args);
  }
}
