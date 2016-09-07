import { API } from "../src/api";
import { Artichoke } from "../src/artichoke";
import { Call } from "../src/call";
import { EventHandler } from "../src/events";
import { config, log } from "./fixtures";
import { Event } from "../src/protocol";
import { Room } from "../src/room";

class APIMock extends API {
    cb;

    onEvent(callback) {
        this.cb = callback;
    }

    connect() {
        // Do nothing.
    }
}

describe("Artichoke", () => {
    it("should notify on a new event", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let a = new Artichoke(config, log, events, api);

        events.onEvent("hello", (msg) => done());

        a.connect();

        api.cb({
            type: "hello"
        } as Event);
    });

    it("should call a callback on server connection", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let a = new Artichoke(config, log, events, api);

        a.onConnect((msg) => done());

        a.connect();

        api.cb({
            type: "hello"
        } as Event);
    });

    it("should call a callback on server error", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let a = new Artichoke(config, log, events, api);

        a.onError((error) => done());

        a.connect();

        api.cb({
            type: "error",
            reason: "why not?"
        } as Event);
    });
});
