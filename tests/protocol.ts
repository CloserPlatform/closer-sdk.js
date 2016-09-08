import { Error, Event, Message, Presence, read, RoomAction, write } from "../src/protocol";

describe("Protocol", () => {
    it("should be reversible", () => {
        let msgs: Array<Event> = [{
            type: "message",
            id: "1234",
            body: "Oi papi!",
            sender: "Bob",
            room: "1234",
            timestamp: Date.now(),
        } as Message, {
            type: "presence",
            sender: "Bob",
            status: "away",
            timestamp: Date.now(),
        } as Presence, {
            type: "room_action",
            id: "123",
            originator: "Bob",
            action: "invited",
            subject: "Alice",
            timestamp: Date.now()
        } as RoomAction, {
            type: "error",
            ref: "23425",
            reason: "Because!"
        } as Error];

        msgs.forEach((m) => expect(read(write(m))).toEqual(m));
    });
});
