import { LogLevel } from './log-level';

// tslint:disable:no-any
// tslint:disable:no-console
// tslint:disable:readonly-array
export class LoggerService {
  constructor(private logLevel: LogLevel,
              private logPrefix?: string) {
  }

  public log(msg: string, ...args: any[]): void {
    this.print(console.log.bind(this), msg, args);
  }

  public trace(msg: string, ...args: any[]): void {
    this.print(console.trace.bind(this), msg, args);
  }

  public debug(msg: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.print(console.debug.bind(this), msg, args);
    }
  }
  public info(msg: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.print(console.info.bind(this), msg, args);
    }
  }
  public warn(msg: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.print(console.warn.bind(this), msg, args);
    }
  }

  public error(msg: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.print(console.error.bind(this), msg, args);
    }
  }

  private print(fn: (msg: string, args?: any[]) => void, msg: string, args?: any[]): void {
    const formattedMsg = (this.logPrefix) ? `${this.logPrefix}: ${msg}` : msg;
    if (typeof args !== 'undefined' && args.length > 0) {
      fn(formattedMsg, args);
    } else {
      fn(formattedMsg);
    }
  }
}
