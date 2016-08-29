import { nop } from "./utils";

export type Type = string;
export type ID = string;

export interface Event {
    type: Type;
}

interface EventWithId extends Event {
    id: ID;
}

export interface Error extends Event {
    reason: string;
}

type Callback<T> = (T) => void;

export class EventHandler {
    private perType: { [type: string]: Array<Callback<Event>> } = {};
    private perId: { [type: string]: { [id: string]: Callback<Event> } } = {};

    constructor() {
        this.onError(nop); // NOTE By default do nothing.
    }

    notify(event: Event) {
        if ([this.notifyById(event as EventWithId), this.notifyByType(event)].every((r) => !r)) {
            this.perType["error"].forEach(function(cb) {
                cb({
                    type: "error",
                    reason: "Unhandled event: " + event.type,
                    event
                });
            });
        }
    }

    private notifyByType(event: Event): boolean {
        if (event.type in this.perType) {
            this.perType[event.type].forEach(function(cb) {
                cb(event);
            });
            return true;
        }
        return false;
    }

    private notifyById(event: EventWithId): boolean {
        if (event.type in this.perId && event.id in this.perId[event.type]) {
            this.perId[event.type][event.id](event);
            return true;
        }
        return false;
    }

    onError(callback: Callback<Error>) {
        this.onEvent("error", callback);
    }

    onEvent(type: Type, callback: Callback<Event>) {
        if (!(type in this.perType)) {
            this.perType[type] = [];
        }
        this.perType[type].push(callback);
    }

    onConcreteEvent(type: Type, id: ID, callback: Callback<Event>) {
        if (!(type in this.perId)) {
            this.perId[type] = {};
        }
        this.perId[type][id] = callback;
    }
}
