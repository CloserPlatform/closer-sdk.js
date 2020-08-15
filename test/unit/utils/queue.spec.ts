import { Queue } from '../../../src/utils/queue';
import { getLoggerServiceMock } from '../../mocks/logger.mock';

const getQueue = <T>(): Queue<T> =>
  new Queue<T>(getLoggerServiceMock());

describe('Queue', () => {
  it('not drain if empty', () => {
    const queue = getQueue();
    expect(queue.drain().length).toBe(0);
  });

  it('drain only once', () => {
    const queue = getQueue<string>();
    const items: ReadonlyArray<string> = ['a', 'b', 'c'];

    items.forEach(item => queue.add(item));

    expect(queue.drain().length).toBe(items.length);
    expect(queue.drain().length).toBe(0);
  });
});
