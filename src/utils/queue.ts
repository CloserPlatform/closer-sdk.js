import { LoggerService } from '../logger/logger-service';

export class Queue<T> {

  private queue: ReadonlyArray<T> = [];

  constructor(
    private logger: LoggerService,
  ) {
  }

  public add(item: T): void {
    this.logger.debug(`Saving item`);
    this.queue = [...this.queue, item];
  }

  public drain(): ReadonlyArray<T> {
    const items = this.queue;
    this.queue = [];
    this.logger.debug(`Draining queue of ${items.length} items`);

    return items;
  }
}
