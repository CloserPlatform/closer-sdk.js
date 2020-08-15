import { Queue } from '../../src/utils/queue';
import { getLoggerServiceMock } from './logger.mock';

export const getQueueMock = <T>(): Queue<T> =>
  new Queue<T>(getLoggerServiceMock());
