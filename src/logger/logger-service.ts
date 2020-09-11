import { LogLevel } from './log-level';

// tslint:disable:no-any
// tslint:disable:readonly-array
export class LoggerService {
  constructor(private logLevel: LogLevel,
              private console: Console,
              private logPrefix?: string) {
  }

  public log(msg: string, ...args: any[]): void {
    // tslint:disable-next-line:no-unsafe-any
    this.print(this.console.log.bind(this), msg, args);
  }

  public trace(msg: string, ...args: any[]): void {
    // tslint:disable-next-line:no-unsafe-any
    this.print(this.console.trace.bind(this), msg, args);
  }

  public debug(msg: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      // tslint:disable-next-line:no-unsafe-any
      this.print(this.console.debug.bind(this), msg, args);
    }
  }
  public info(msg: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      // tslint:disable-next-line:no-unsafe-any
      this.print(this.console.info.bind(this), msg, args);
    }
  }
  public warn(msg: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      // tslint:disable-next-line:no-unsafe-any
      this.print(this.console.warn.bind(this), msg, args);
    }
  }

  public error(msg: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      // tslint:disable-next-line:no-unsafe-any
      this.print(this.console.error.bind(this), msg, args);
    }
  }

  private print(fn: (msg: string, args?: any[]) => void, msg: string, args?: any[]): void {
    const formattedMsg = this.getFormattedMessage(msg);
    if (typeof args !== 'undefined' && args.length > 0) {
      fn(formattedMsg, args);
    } else {
      fn(formattedMsg);
    }
  }

  private getFormattedMessage(msg: string): string {
    return (typeof this.logPrefix !== 'undefined') ? `${this.logPrefix}: ${msg}` : msg;
  }
}
