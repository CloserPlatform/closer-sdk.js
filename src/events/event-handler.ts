import { Decoder } from '../codec';
import { Logger } from '../logger';
import { DomainEvent } from '../protocol/events/domain-event';
import { ID, Type } from '../protocol/protocol';
import { UUID } from '../utils/random-utils';

export type Callback<T> = (arg: T) => void;

export class EventHandler {
  private log: Logger;
  private perType: { [type: string]: Array<Callback<DomainEvent>> } = {};
  private perId: { [type: string]: { [id: string]: { [uuid: string]: Callback<DomainEvent> } } } = {};
  private decoder: Decoder<DomainEvent>;

  constructor(log: Logger, decoder: Decoder<DomainEvent>) {
    this.log = log;
    this.decoder = decoder;
  }

  public notify(event: DomainEvent, onUnhandled?: (ev: DomainEvent) => void): void {
    if ([this.notifyById(event), this.notifyByType(event)].every((r) => !r)) {
      this.log.info('Unhandled event ' + event.tag + ': ' + event);
      if (onUnhandled) {
        onUnhandled(event);
      }
    }
  }

  public onEvent(type: Type, callback: Callback<DomainEvent>): void {
    this.log.debug('Registered callback for event type ' + type);

    if (!(type in this.perType)) {
      this.perType[type] = [];
    }
    this.perType[type].push(callback);
  }

  public onConcreteEvent(type: Type, id: ID, uuid: UUID, callback: Callback<DomainEvent>): void {
    this.log.debug('Registered callback for event type ' + type + ', id ' + id);

    if (!(type in this.perId)) {
      this.perId[type] = {};
    }
    if (!(id in this.perId[type])) {
      this.perId[type][id] = {};
    }
    this.perId[type][id][uuid] = callback;
  }

  private notifyByType(event: DomainEvent): boolean {
    if (event.tag in this.perType) {
      this.log.debug('Running callbacks for event type ' + event.tag);
      this.perType[event.tag].forEach((cb) => cb(event));

      return true;
    }

    return false;
  }

  private notifyById(event: DomainEvent): boolean {
    // FIXME
    // tslint:disable-next-line:no-any
    const id = (event as any).roomId || (event as any).callId;
    if (id && event.tag in this.perId && id in this.perId[event.tag]) {
      this.log.debug('Running callbacks for event type ' + event.tag + ', id ' + id);
      const callbacksForId = this.perId[event.tag][id];
      Object.keys(callbacksForId).forEach((uuid) => callbacksForId[uuid](event));

      return true;
    }

    return false;
  }
}
