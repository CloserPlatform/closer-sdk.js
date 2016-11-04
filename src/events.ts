import { Logger } from "./logger";
import { Error, Event, ID, Type, write } from "./protocol";

export interface Callback<T> {
  (arg: T): void;
}

export class EventHandler {
  private log: Logger;
  private perType: { [type: string]: Array<Callback<Event>> } = {};
  private perId: { [type: string]: { [id: string]: Callback<Event> } } = {};

  constructor(log: Logger) {
    this.log = log;
    this.onError((e: Error) => {
      // Do nothing.
    });
  }

  raise(reason: string, cause?: any) {
    this.perType["error"].forEach(function(cb) {
      cb({
        type: "error",
        reason,
        cause
      } as Event);
    });
  }

  notify(event: Event) {
    if ([this.notifyById(event), this.notifyByType(event)].every((r) => !r)) {
      this.log("Unhandled event " + event.type + ": " + write(event));
      this.raise("Unhandled event: " + event.type, event);
    }
  }

  private notifyByType(event: Event): boolean {
    if (event.type in this.perType) {
      this.log("Running callbacks for event type " + event.type);
      this.perType[event.type].forEach(function(cb) {
        cb(event);
      });
      return true;
    }
    return false;
  }

  private notifyById(event: Event): boolean {
    if (event.id && event.type in this.perId && event.id in this.perId[event.type]) {
      this.log("Running callbacks for event type " + event.type + ", id " + event.id);
      this.perId[event.type][event.id](event);
      return true;
    }
    return false;
  }

  onError(callback: Callback<Error>) {
    this.onEvent("error", callback);
  }

  onEvent(type: Type, callback: Callback<Event>) {
    this.log("Registered callback for event type " + type);

    if (!(type in this.perType)) {
      this.perType[type] = [];
    }
    this.perType[type].push(callback);
  }

  onConcreteEvent(type: Type, id: ID, callback: Callback<Event>) {
    this.log("Registered callback for event type " + type + ", id " + id);

    if (!(type in this.perId)) {
      this.perId[type] = {};
    }
    this.perId[type][id] = callback;
  }
}
