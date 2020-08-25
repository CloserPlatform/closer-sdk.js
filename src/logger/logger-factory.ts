import { LogLevel } from './log-level';
import { LoggerService } from './logger-service';

export class LoggerFactory {
  constructor(
    private readonly logLevel: LogLevel,
  ) {
  }

  public create(logPrefix?: string): LoggerService {
    return new LoggerService(this.logLevel, console, logPrefix);
  }
}
