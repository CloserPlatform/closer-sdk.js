import { LoggerService } from '../../src/logger/logger-service';
import { LogLevel } from '../../src';
import { LoggerFactory } from '../../src/logger/logger-factory';

export const getLoggerServiceMock = (): LoggerService =>
  new LoggerService(LogLevel.ERROR, console, 'MockLogger');

export const getLoggerFactoryMock = (): LoggerFactory =>
  new LoggerFactory(LogLevel.WARN);
