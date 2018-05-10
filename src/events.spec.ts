import { EventHandler } from "./events";
import { log } from "./fixtures.spec";
import { decoder } from "./protocol/events/domain-event";
import { errorEvents } from "./protocol/events/error-events";
import { roomEvents } from "./protocol/events/room-events";
import { randomUUID } from "./utils";
import MarkSent = roomEvents.MarkSent;

class ErrorWithCause extends errorEvents.Error {
  constructor(reason: string, cause: boolean) {
    super(reason);
    this.cause = cause;
  }
  cause: boolean;
}

function msg(id: string): MarkSent {
  return new roomEvents.MarkSent(id, "123", Date.now());
}

describe("Event Handler", () => {
  let events: EventHandler;

  beforeEach(() => {
    events = new EventHandler(log, decoder);
  });

  it("should allow defining & invoking error handlers", () => {
    let ok = true;

    events.onEvent(errorEvents.Error.tag, (error: ErrorWithCause) => ok = error.cause);
    expect(ok).toBe(true);
    events.notify(new ErrorWithCause("Dun goofed", false));
    expect(ok).toBe(false);
    events.notify(new ErrorWithCause("j/k", true));
    expect(ok).toBe(true);
  });

  it("should run error handler on unhandled event", () => {
    let ok = false;

    events.onEvent(errorEvents.Error.tag, (error: ErrorWithCause) => ok = true);
    expect(ok).toBe(false);
    events.notify({ tag: "unhandled", __discriminator__: "domainEvent" },
      () => events.notify(new errorEvents.Error("Unhandled")));
    expect(ok).toBe(true);
  });

  it("should allow defining event handlers", () => {
    let ok = 0;

    events.onEvent(roomEvents.MarkSent.tag, (msg: roomEvents.MarkSent) => ok++);
    expect(ok).toBe(0);

    [1, 2, 3, 4, 5].forEach((i) => {
      events.notify(msg(i.toString()));
      expect(ok).toBe(i);
    });
  });

  it("should allow defining multiple event handlers and run them all", () => {
    let first = 0;
    let second = 0;

    events.onEvent(roomEvents.MarkSent.tag, (msg: roomEvents.MarkSent) => first++);
    events.onEvent(roomEvents.MarkSent.tag, (msg: roomEvents.MarkSent) => second++);

    [1, 2, 3, 4, 5].forEach((i) => events.notify(msg(i.toString())));

    expect(first).toBe(5);
    expect(second).toBe(5);
  });

  it("should allow defining concrete event handlers", () => {
    let ok = "0";

    events.onConcreteEvent(roomEvents.MarkSent.tag, "3", randomUUID(), (msg: roomEvents.MarkSent) => ok = msg.roomId);

    [1, 2, 3, 4, 5].forEach((i) => events.notify(msg(i.toString())));

    expect(ok).toBe("3");
  });

  it("should allow defining multiple concrete event handlers and run them all", () => {
    let first = false;
    let second = false;

    events.onConcreteEvent(roomEvents.MarkSent.tag, "3", randomUUID(), (msg: roomEvents.MarkSent) => first = true);
    events.onConcreteEvent(roomEvents.MarkSent.tag, "1", randomUUID(), (msg: roomEvents.MarkSent) => second = true);

    [1, 2, 3, 4, 5].forEach((i) => events.notify(msg(i.toString())));

    expect(first).toBe(true);
    expect(second).toBe(true);
  });

  it("should run regular event handlers even if concrete event handlers are defined", () => {
    let first = false;
    let second = 0;

    events.onConcreteEvent(roomEvents.MarkSent.tag, "3", randomUUID(), (msg: roomEvents.MarkSent) => first = true);
    events.onEvent(roomEvents.MarkSent.tag, (msg: roomEvents.MarkSent) => second++);

    [1, 2, 3, 4, 5].forEach((i) => events.notify(msg(i.toString())));

    expect(first).toBe(true);
    expect(second).toBe(5);
  });

  it("onConcreteEvent() should be equivalent to onEvent() with id assertion", () => {
    let first: roomEvents.MarkSent = undefined;
    let second: roomEvents.MarkSent = undefined;

    events.onConcreteEvent(roomEvents.MarkSent.tag, "3", randomUUID(), (msg: roomEvents.MarkSent) => first = msg);
    events.onEvent(roomEvents.MarkSent.tag, (msg: roomEvents.MarkSent) => {
      if (msg.roomId === "3") {
        second = msg;
      }
    });

    [1, 2, 3, 4, 5].forEach((i) => events.notify(msg(i.toString())));

    expect(first).toBe(second);
    expect(first.roomId).toBe("3");
  });
});
