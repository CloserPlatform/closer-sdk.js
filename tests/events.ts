import { Error, Event, EventHandler } from "../src/events";

interface ErrorWithStatus extends Error {
    status: boolean;
}

interface Message extends Event {
    id: string;
    body: string;
    sender: string;
}

describe("Event Handler", () => {
    it("should allow defining error handlers", () => {
        let eh = new EventHandler();
        let ok = false;

        eh.onError((error: ErrorWithStatus) => {
            ok = error.status;
        });

        expect(ok).toBe(false);

        eh.notify({
            type: "error",
            reason: "Dun goofed",
            status: true
        } as Error);

        expect(ok).toBe(true);
    });

    it("should run error handler on unhandeld message", () => {
        let eh = new EventHandler();
        let ok = false;

        eh.onError((error: Error) => {
            ok = true;
        });

        expect(ok).toBe(false);

        eh.notify({ type: "unhandled" });

        expect(ok).toBe(true);
    });

    it("should allow defining event handlers", () => {
        let eh = new EventHandler();
        let ok = 0;

        eh.onEvent("message", (msg: Message) => {
            console.log("[" + msg.sender + "] " + msg.body);
            ok++;
        });

        expect(ok).toBe(0);

        [1, 2, 3, 4, 5].forEach((i) => {
            eh.notify({
                type: "message",
                id: i.toString(),
                body: "Oh hi",
                sender: "bob"
            } as Message);

            expect(ok).toBe(i);
        });
    });

    it("should allow defining concrete event handlers", () => {
        let eh = new EventHandler();
        let ok = "0";

        eh.onConcreteEvent("message", "3", (msg: Message) => {
            console.log("[" + msg.sender + "] " + msg.body);
            ok = msg.id;
        });

        [1, 2, 3, 4, 5].forEach((i) => {
            eh.notify({
                type: "message",
                id: i.toString(),
                body: "Hi bob",
                sender: "alice"
            } as Message);
        });

        expect(ok).toBe("3");
    });
});
