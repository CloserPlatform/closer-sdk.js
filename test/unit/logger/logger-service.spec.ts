import { LoggerService } from '../../../src/logger/logger-service';
import { LogLevel } from '../../../src';

const mockedConsole: Console = console;

const getLoggerService = (level = LogLevel.ERROR, prefix?: string): LoggerService =>
  new LoggerService(level, console, prefix);

describe('LoggerService', () => {
  it('print error for error log level with prefix and args', () => {
    spyOn(mockedConsole, 'error');
    const loggerService = getLoggerService(LogLevel.ERROR, 'prefix');
    loggerService.error('test', 'test');
    expect(mockedConsole.error).toHaveBeenCalledWith('prefix: test', ['test']);
  });

  it('print error for error log level with prefix', () => {
    spyOn(mockedConsole, 'error');
    const loggerService = getLoggerService(LogLevel.ERROR, 'prefix');
    loggerService.error('test');
    expect(mockedConsole.error).toHaveBeenCalledWith('prefix: test');
  });

  it('not print log warn for error log level', () => {
    spyOn(mockedConsole, 'error');
    const loggerService = getLoggerService();
    loggerService.warn('test', 'test');
    loggerService.warn('test');
    expect(mockedConsole.error).not.toHaveBeenCalled();
  });

  it('not print anything for NONE level', () => {
    spyOn(mockedConsole, 'error');
    spyOn(mockedConsole, 'info');
    spyOn(mockedConsole, 'debug');
    spyOn(mockedConsole, 'warn');
    const loggerService = getLoggerService(LogLevel.NONE);

    loggerService.error('test');
    loggerService.info('test');
    loggerService.debug('test');
    loggerService.warn('test');

    expect(mockedConsole.error).not.toHaveBeenCalled();
    expect(mockedConsole.info).not.toHaveBeenCalled();
    expect(mockedConsole.debug).not.toHaveBeenCalled();
    expect(mockedConsole.warn).not.toHaveBeenCalled();
  });

  it('print everything for DEBUG level', () => {
    const msg = 'test';
    spyOn(mockedConsole, 'error');
    spyOn(mockedConsole, 'info');
    spyOn(mockedConsole, 'debug');
    spyOn(mockedConsole, 'warn');
    spyOn(mockedConsole, 'log');
    const loggerService = getLoggerService(LogLevel.DEBUG);

    loggerService.error(msg);
    loggerService.info(msg);
    loggerService.debug(msg);
    loggerService.warn(msg);
    loggerService.log(msg);

    expect(mockedConsole.error).toHaveBeenCalledWith(msg);
    expect(mockedConsole.info).toHaveBeenCalledWith(msg);
    expect(mockedConsole.debug).toHaveBeenCalledWith(msg);
    expect(mockedConsole.warn).toHaveBeenCalledWith(msg);
    expect(mockedConsole.log).toHaveBeenCalledWith(msg);

    loggerService.error(msg, msg);
    loggerService.info(msg, msg);
    loggerService.debug(msg, msg);
    loggerService.warn(msg, msg);
    loggerService.log(msg, msg);

    expect(mockedConsole.error).toHaveBeenCalledWith(msg, [msg]);
    expect(mockedConsole.info).toHaveBeenCalledWith(msg, [msg]);
    expect(mockedConsole.debug).toHaveBeenCalledWith(msg, [msg]);
    expect(mockedConsole.warn).toHaveBeenCalledWith(msg, [msg]);
    expect(mockedConsole.log).toHaveBeenCalledWith(msg, [msg]);
  });
});
