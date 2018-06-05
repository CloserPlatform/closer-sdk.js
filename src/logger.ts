export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface Logger {
  // tslint:disable-next-line:no-any
  error(line: any): void;
  // tslint:disable-next-line:no-any
  warn(line: any): void;
  // tslint:disable-next-line:no-any
  info(line: any): void;
  // tslint:disable-next-line:no-any
  debug(line: any): void;

  setLevel(level: LogLevel): void;
}

export class ConsoleLogger implements Logger {
  private logLevel: LogLevel;

  constructor(level: LogLevel) {
    this.logLevel = level;
  }

  public setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  // tslint:disable-next-line:no-any
  public error(message: any): void {
    this.log(LogLevel.ERROR, message);
  }

  // tslint:disable-next-line:no-any
  public warn(message: any): void {
    this.log(LogLevel.WARN, message);
  }

  // tslint:disable-next-line:no-any
  public info(message: any): void {
    this.log(LogLevel.INFO, message);
  }

  // tslint:disable-next-line:no-any
  public debug(message: any): void {
    this.log(LogLevel.DEBUG, message);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  // tslint:disable-next-line:no-any
  private log(level: LogLevel, message: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logger = (level === LogLevel.ERROR) ? console.error : console.log;
    logger({
      level: LogLevel[level],
      message
    });
  }
}
