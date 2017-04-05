import { Logger } from "./logger";
import { error, eventTypes, write } from "./protocol/events";
import { ID, Type } from "./protocol/protocol";
import { RichError, RichEvent } from "./protocol/rich-events";

export interface Callback<T> {
  (arg: T): void;
}

export class EventHandler {
  private log: Logger;
  private perType: { [type: string]: Array<Callback<RichEvent>> } = {};
  private perId: { [type: string]: { [id: string]: Callback<RichEvent> } } = {};

  constructor(log: Logger) {
    this.log = log;
    this.onError((e: RichError) => {
      // Do nothing.
    });
  }

  raise(reason: string, cause?: any) {
    this.perType["error"].forEach(function(cb) {
      cb(error(reason, cause));
    });
  }

  notify(event: RichEvent) {
    if ([this.notifyById(event), this.notifyByType(event)].every((r) => !r)) {
      this.log("Unhandled event " + event.type + ": " + write(event));
      this.raise("Unhandled event: " + event.type, event);
    }
  }

  private notifyByType(event: RichEvent): boolean {
    if (event.type in this.perType) {
      this.log("Running callbacks for event type " + event.type);
      this.perType[event.type].forEach(function(cb) {
        cb(event);
      });
      return true;
    }
    return false;
  }

  private notifyById(event: RichEvent): boolean {
    if (event.id && event.type in this.perId && event.id in this.perId[event.type]) {
      this.log("Running callbacks for event type " + event.type + ", id " + event.id);
      this.perId[event.type][event.id](event);
      return true;
    }
    return false;
  }

  onError(callback: Callback<RichError>) {
    this.onEvent(eventTypes.ERROR, callback);
  }

  onEvent(type: Type, callback: Callback<RichEvent>) {
    this.log("Registered callback for event type " + type);

    if (!(type in this.perType)) {
      this.perType[type] = [];
    }
    this.perType[type].push(callback);
  }

  onConcreteEvent(type: Type, id: ID, callback: Callback<RichEvent>) {
    this.log("Registered callback for event type " + type + ", id " + id);

    if (!(type in this.perId)) {
      this.perId[type] = {};
    }
    this.perId[type][id] = callback;
  }
}
