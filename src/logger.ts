export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface Logger {
  error: (line: any) => void;
  warn: (line: any) => void;
  info: (line: any) => void;
  debug: (line: any) => void;

  setLevel: (level: LogLevel) => void;
}

export class ConsoleLogger implements Logger {
  private logLevel: LogLevel;

  constructor(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private log(level: LogLevel, message: any) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logger = (level === LogLevel.ERROR) ? console.error : console.log;
    logger({
      level: LogLevel[level],
      message
    });
  }

  setLevel(level: LogLevel) {
    this.logLevel = level;
  }

  error(message: any) {
    this.log(LogLevel.ERROR, message);
  }

  warn(message: any) {
    this.log(LogLevel.WARN, message);
  }

  info(message: any) {
    this.log(LogLevel.INFO, message);
  }

  debug(message: any) {
    this.log(LogLevel.DEBUG, message);
  }
}
