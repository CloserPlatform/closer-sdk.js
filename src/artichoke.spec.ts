import { ArtichokeAPI } from "./api";
import { Artichoke } from "./artichoke";
import { EventHandler } from "./events";
import { apiKey, config, deviceId, log, sessionId } from "./fixtures.spec";
import { Event, Hello } from "./protocol/events";
import { Call, Room } from "./protocol/wire-entities";
import { codec, disconnect, error, eventTypes } from "./protocol/wire-events";

const roomId = "234";
const callId = "123";
const alice = "321";

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

  disconnect() {
    // Do nothing.
  }
}

describe("Artichoke", () => {
  let events: EventHandler<Event>;
  let api;
  let chat;

  beforeEach(() => {
    events = new EventHandler(log, codec);
    api = new APIMock();
    chat = new Artichoke(config.chat, log, events, api);
  });

  it("should notify on a new event", (done) => {
    events.onEvent(eventTypes.HELLO, (msg: Hello) => done());
    chat.connect();
    api.cb({
      type: eventTypes.HELLO,
      deviceId,
      heartbeatTimeout: 200,
    } as Event);
  });

  it("should call a callback on server connection", (done) => {
    chat.onConnect((msg) => done());
    chat.connect();
    api.cb({
      type: eventTypes.HELLO,
      deviceId,
      heartbeatTimeout: 200,
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

  it("should invoke \"onServerUnreachable\" if no heartbeat received within double time given in hello", (done) => {
    jasmine.clock().install();

    const heartbeatTimeout = 20;

    chat.onServerUnreachable(() => done());
    chat.connect();
    api.cb({
      type: eventTypes.HELLO,
      deviceId,
      heartbeatTimeout,
    } as Event);

    jasmine.clock().tick(2 * heartbeatTimeout + 1);
    jasmine.clock().uninstall();
  });

  it("should not invoke \"onServerUnreachable\" if heartbeat is received within time given in hello ", (done) => {
    jasmine.clock().install();

    const heartbeatTimeout = 20;
    chat.onServerUnreachable(() => done.fail());
    chat.connect();

    api.cb({
      type: eventTypes.HELLO,
      deviceId,
      heartbeatTimeout,
    } as Event);

    const interval = setInterval(() => {
      api.cb({
        type: eventTypes.HEARTBEAT,
        timestamp: 1234,
      } as Event);
    }, heartbeatTimeout);

    jasmine.clock().tick(10 * heartbeatTimeout);
    clearInterval(interval);
    done();

    jasmine.clock().uninstall();
  });

  it("should not invoke \"onServerUnreachable\" if \"disconnect()\" was called", (done) => {
    jasmine.clock().install();

    const heartbeatTimeout = 20;

    chat.onServerUnreachable(() => done.fail());
    chat.connect();
    api.cb({
      type: eventTypes.HELLO,
      deviceId,
      heartbeatTimeout,
    } as Event);

    chat.disconnect();
    jasmine.clock().tick(2 * heartbeatTimeout + 1);
    done();

    jasmine.clock().uninstall();
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

  it("should run a callback when a room is created", (done) => {
    events.onEvent(eventTypes.ERROR, (error) => done.fail());

    const roomObj = {
      id: roomId,
      name: "room",
      created: 123,
      users: [alice],
      direct: false,
    } as Room;

    chat.onRoomCreated((e) => {
      expect(e.room).toBe(roomObj);
      done();
    });

    events.notify({
      type: eventTypes.ROOM_CREATED,
      room: roomObj
    } as Event);
  });

  it("should run a callback when a call is created", (done) => {
    events.onEvent(eventTypes.ERROR, (error) => done.fail());

    const callObj = {
      id: callId,
      created: 123,
      users: [alice],
      direct: true
    } as Call;

    chat.onCallCreated((c) => {
      expect(c.call).toBe(callObj);
      done();
    });

    events.notify({
      type: eventTypes.CALL_CREATED,
      call: callObj
    } as Event);
  });
});
