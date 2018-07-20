import { LogLevel } from './log-level';
import { LoggerService } from './logger-service';

export class LoggerFactory {
  constructor(private logLevel: LogLevel) {
  }

  public create = (logPrefix?: string): LoggerService =>
    new LoggerService(this.logLevel, logPrefix)
}
