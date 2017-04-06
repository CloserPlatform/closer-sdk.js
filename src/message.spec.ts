import { ArtichokeAPI } from "./api";
import { EventHandler } from "./events";
import { apiKey, config, log, sleep } from "./fixtures.spec";
import { createMessage } from "./message";
import { eventTypes } from "./protocol/wire-events";
import { Delivered, Message } from "./protocol/protocol";
import { RichChatDelivered, RichChatEdited } from "./protocol/events";

const roomId = "123";
const bob = "456";
const msg1 = "2323";

class APIMock extends ArtichokeAPI {
  setDelivery = false;
  updatedArchivable = false;

  constructor() {
    super(apiKey, config.chat, log);
  }

  setDelivered(messageId, timestamp) {
    this.setDelivery = true;
  }

  updateArchivable(archivable, timestamp) {
    this.updatedArchivable = true;
    return Promise.resolve(archivable);
  }
}

function makeMsg(delivered?: Delivered): Message {
  return {
    type: "message",
    id: msg1,
    body: "Hi!",
    user: bob,
    room: roomId,
    timestamp: 123,
    delivered
  };
}

describe("Message", () => {
  let events;
  let api;
  let msg;

  beforeEach(() => {
    events = new EventHandler(log);
    api = new APIMock();
    msg = createMessage(makeMsg(), log, events, api);
  });

  it("should allow marking as delivered", () => {
    expect(msg.delivered).not.toBeDefined();
    msg.markDelivered();
    expect(api.setDelivery).toBe(true);
    expect(msg.delivered).toBeDefined();
  });

  it("should not mark delivered msgs as delivered", () => {
    msg = createMessage(makeMsg({user: bob, timestamp: 987}), log, events, api);
    let d = msg.delivered;

    msg.markDelivered();
    expect(api.setDelivery).toBe(false);
    expect(msg.delivered).toBe(d);
  });

  it("should not mark as delivered twice", (done) => {
    expect(msg.delivered).not.toBeDefined();
    msg.markDelivered();
    expect(api.setDelivery).toBe(true);
    api.setDelivery = false;

    let d = msg.delivered;

    sleep(100).then(() => {
      msg.markDelivered();
      expect(api.setDelivery).toBe(false);
      expect(msg.delivered).toBe(d);
      done();
    });
  });

  it("should run a callback on delivery", (done) => {
    expect(msg.delivered).not.toBeDefined();
    msg.onDelivery((delivery) => {
      expect(api.setDelivery).toBe(false);
      expect(msg.delivered.user).toBe(bob);
      expect(msg.delivered.timestamp).toBe(12345);
      done();
    });

    events.notify({
      type: eventTypes.CHAT_DELIVERED,
      id: msg.id,
      user: bob,
      timestamp: 12345
    } as RichChatDelivered);
  });

  it("should run a callback on each delivery", (done) => {
    let count = 0;

    expect(msg.delivered).not.toBeDefined();
    msg.onDelivery((m) => {
      count++;
      if (count === 2) {
        done();
      }
    });

    [123, 456].forEach((t) => events.notify({
      type: eventTypes.CHAT_DELIVERED,
      id: msg.id,
      user: bob,
      timestamp: t
    } as RichChatDelivered));
  });

  it("should allow editing", () => {
    expect(msg.edited).not.toBeDefined();
    msg.edit("edited body");
    expect(api.updatedArchivable).toBe(true);
    expect(msg.edited).toBeDefined();
  });

  it("should run a callback on edit", (done) => {
    let edited = makeMsg();
    let body = "edited body";
    edited.body = body;
    edited.edited = {
      user: bob,
      timestamp: Date.now()
    };
    expect(msg.edited).not.toBeDefined();

    msg.onEdit((m) => {
      expect(m.body).toBe(body);
      expect(m.edited).toBeDefined();
      done();
    });

    events.notify({
      type: eventTypes.CHAT_EDITED,
      id: msg.id,
      archivable: edited
    } as RichChatEdited);
  });
});
