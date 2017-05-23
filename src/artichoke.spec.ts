import { ArtichokeAPI } from "./api";
import { Artichoke } from "./artichoke";
import { EventHandler } from "./events";
import { apiKey, config, deviceId, log } from "./fixtures.spec";
import { disconnect, error, eventTypes } from "./protocol/wire-events";
import { Event, Hello } from "./protocol/events";

class APIMock extends ArtichokeAPI {
  cb;

  constructor() {
    super(apiKey, config.chat, log);
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
  let chat;

  beforeEach(() => {
    events = new EventHandler(log);
    api = new APIMock();
    chat = new Artichoke(config.chat, log, events, api);
  });

  it("should notify on a new event", (done) => {
    events.onEvent(eventTypes.HELLO, (msg: Hello) => done());
    chat.connect();
    api.cb({
      type: eventTypes.HELLO,
      deviceId,
    } as Event);
  });

  it("should call a callback on server connection", (done) => {
    chat.onConnect((msg) => done());
    chat.connect();
    api.cb({
      type: eventTypes.HELLO,
      deviceId,
    } as Event);
  });

  it("should call a callback on server heartbeat", (done) => {
    chat.onHeartbeat((hb) => done());
    chat.connect();
    api.cb({
      type: eventTypes.HEARTBEAT,
      timestamp: 1234,
    } as Event);
  });

  it("should call a callback on server disconnection", (done) => {
    chat.onDisconnect((msg) => done());
    chat.connect();
    api.cb(disconnect(1023, "Too much effort."));
  });

  it("should call a callback on server error", (done) => {
    chat.onError((error) => done());
    chat.connect();
    api.cb(error("why not?"));
  });
});
