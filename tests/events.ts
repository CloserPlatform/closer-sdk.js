import { EventHandler } from "../src/events";
import { log } from "./fixtures";
import { Error, Event, Message} from "../src/protocol";

interface ErrorWithStatus extends Error {
    status: boolean;
}

describe("Event Handler", () => {
    it("should allow defining error handlers", () => {
        let eh = new EventHandler(log);
        let ok = false;

        eh.onError((error: ErrorWithStatus) => ok = error.status);
        expect(ok).toBe(false);

        eh.notify({
            type: "error",
            reason: "Dun goofed",
            status: true
        } as Error);

        expect(ok).toBe(true);
    });

    it("should run error handler on unhandled message", () => {
        let eh = new EventHandler(log);
        let ok = false;

        eh.onError((error: Error) => ok = true);
        expect(ok).toBe(false);
        eh.notify({ type: "unhandled" });
        expect(ok).toBe(true);
    });

    it("should allow defining event handlers", () => {
        let eh = new EventHandler(log);
        let ok = 0;

        eh.onEvent("message", (msg: Message) => ok++);
        expect(ok).toBe(0);

        [1, 2, 3, 4, 5].forEach((i) => {
            eh.notify({
                type: "message",
                id: i.toString(),
                room: "room",
                body: "Oh hi",
                sender: "bob",
                timestamp: Date.now()
            } as Message);

            expect(ok).toBe(i);
        });
    });

    it("should allow defining multiple event handlers and run them all", () => {
        let eh = new EventHandler(log);
        let first = 0;
        let second = 0;

        eh.onEvent("message", (msg: Message) => first++);
        eh.onEvent("message", (msg: Message) => second++);

        [1, 2, 3, 4, 5].forEach((i) => {
            eh.notify({
                type: "message",
                id: i.toString(),
                room: "room",
                body: "Oh hi",
                sender: "bob",
                timestamp: Date.now()
            } as Message);
        });

        expect(first).toBe(5);
        expect(second).toBe(5);
    });

    it("should allow defining concrete event handlers", () => {
        let eh = new EventHandler(log);
        let ok = "0";

        eh.onConcreteEvent("message", "3", (msg: Message) => ok = msg.id);

        [1, 2, 3, 4, 5].forEach((i) => {
            eh.notify({
                type: "message",
                id: i.toString(),
                room: "room",
                body: "Hi bob",
                sender: "alice",
                timestamp: Date.now()
            } as Message);
        });

        expect(ok).toBe("3");
    });

    it("should allow defining multiple concrete event handlers and run them all", () => {
        let eh = new EventHandler(log);
        let first = false;
        let second = false;

        eh.onConcreteEvent("message", "3", (msg: Message) => first = true);
        eh.onConcreteEvent("message", "1", (msg: Message) => second = true);

        [1, 2, 3, 4, 5].forEach((i) => {
            eh.notify({
                type: "message",
                id: i.toString(),
                room: "room",
                body: "Hi bob",
                sender: "alice",
                timestamp: Date.now()
            } as Message);
        });

        expect(first).toBe(true);
        expect(second).toBe(true);
    });

    it("should run regular event handlers even if concrete event handlers are defined", () => {
        let eh = new EventHandler(log);
        let first = false;
        let second = 0;

        eh.onConcreteEvent("message", "3", (msg: Message) => first = true);
        eh.onEvent("message", (msg: Message) => second++);

        [1, 2, 3, 4, 5].forEach((i) => {
            eh.notify({
                type: "message",
                id: i.toString(),
                room: "room",
                body: "Hi bob",
                sender: "alice",
                timestamp: Date.now()
            } as Message);
        });

        expect(first).toBe(true);
        expect(second).toBe(5);
    });
});
