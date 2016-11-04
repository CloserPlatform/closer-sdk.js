import { ArtichokeAPI } from "./api";
import { Artichoke } from "./artichoke";
import { EventHandler } from "./events";
import { apiKey, config, log, sessionId } from "./fixtures.spec";
import { Event } from "./protocol";

class APIMock extends ArtichokeAPI {
    cb;

    constructor() {
        super(sessionId, apiKey, config.chat, log);
    }

    onEvent(callback) {
        this.cb = callback;
    }

    connect() {
        // Do nothing.
    }
}

describe("Artichoke", () => {
    let events;
    let api;
    let manager;

    beforeEach(() => {
        events = new EventHandler(log);
        api = new APIMock();
        manager = new Artichoke(config.chat, log, events, api);
    });

    it("should notify on a new event", (done) => {
        events.onEvent("hello", (msg) => done());

        manager.connect();

        api.cb({
            type: "hello"
        } as Event);
    });

    it("should call a callback on server connection", (done) => {
        manager.onConnect((msg) => done());
        manager.connect();

        api.cb({
            type: "hello"
        } as Event);
    });

    it("should call a callback on server error", (done) => {
        manager.onError((error) => done());
        manager.connect();

        api.cb({
            type: "error",
            reason: "why not?"
        } as Event);
    });
});
