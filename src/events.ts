import { Codec, EventEntity } from "./codec";
import { Logger } from "./logger";
import { ID, Type } from "./protocol/protocol";

export interface Callback<T> {
  (arg: T): void;
}

export class EventHandler<T extends EventEntity> {
  private log: Logger;
  private perType: { [type: string]: Array<Callback<T>> } = {};
  private perId: { [type: string]: { [id: string]: Array<Callback<T>> } } = {};
  private codec: Codec<T>;

  constructor(log: Logger, codec: Codec<T>) {
    this.log = log;
    this.codec = codec;
  }

  notify(event: T, onUnhandled?: (ev: T) => void) {
    if ([this.notifyById(event), this.notifyByType(event)].every((r) => !r)) {
      this.log.info("Unhandled event " + event.type + ": " + event);
      if (onUnhandled) {
        onUnhandled(event);
      }
    }
  }

  private notifyByType(event: T): boolean {
    if (event.type in this.perType) {
      this.log.debug("Running callbacks for event type " + event.type);
      this.perType[event.type].forEach((cb) => cb(event));
      return true;
    }
    return false;
  }

  private notifyById(event: T): boolean {
    if (event.id && event.type in this.perId && event.id in this.perId[event.type]) {
      this.log.debug("Running callbacks for event type " + event.type + ", id " + event.id);
      this.perId[event.type][event.id].forEach((cb) => cb(event));
      return true;
    }
    return false;
  }

  onEvent(type: Type, callback: Callback<T>) {
    this.log.debug("Registered callback for event type " + type);

    if (!(type in this.perType)) {
      this.perType[type] = [];
    }
    this.perType[type].push(callback);
  }

  onConcreteEvent(type: Type, id: ID, callback: Callback<T>) {
    this.log.debug("Registered callback for event type " + type + ", id " + id);

    if (!(type in this.perId)) {
      this.perId[type] = {};
    }
    if (!(id in this.perId[type])) {
      this.perId[type][id] = [];
    }
    this.perId[type][id].push(callback);
  }
}
