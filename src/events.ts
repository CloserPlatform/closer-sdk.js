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
        let e = event as EventWithId;

        if (e.id && e.type in this.perId && e.id in this.perId[e.type]) {
            this.perId[e.type][e.id](e);
        } else if (e.type in this.perType) {
            this.perType[e.type].forEach(function(cb) {
                cb(e);
            });
        } else {
            this.perType["error"].forEach(function(cb) {
                cb({
                    type: "error",
                    reason: "Unhandled event: " + e.type,
                    event: e
                });
            });
        }
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
