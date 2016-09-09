import * as proto from "../src/protocol";

const presence: proto.Presence = {
    type: "presence",
    sender: "Bob",
    status: "away",
    timestamp: Date.now(),
};

describe("Protocol", () => {
    it("should be reversible", () => {
        let events: Array<proto.Event> = [
            presence, {
                type: "message",
                id: "1234",
                body: "Oi papi!",
                sender: "Bob",
                room: "1234",
                timestamp: Date.now(),
            } as proto.Message, {
                type: "room_action",
                id: "123",
                originator: "Bob",
                action: "invited",
                subject: "Alice",
                timestamp: Date.now()
            } as proto.RoomAction, {
                type: "error",
                ref: "23425",
                reason: "Because!"
            } as proto.Error
        ];

        events.forEach((e) => expect(proto.read(proto.write(e))).toEqual(e));
    });

    it("backend fixers should be reversible", () => {
        let events: Array<proto.Event> = [
            presence, {
                type: "call_invitation",
                call: {
                    id: "123",
                    users: [],
                    direct: false
                },
                user: "321"
            } as proto.CallInvitation, {
                type: "room_created",
                room: {
                    id: "123",
                    name: "room",
                    direct: false
                }
            } as proto.RoomInvitation
        ];

        events.forEach((e) => {
            let fixed = proto.fix(e);
            console.log("test:", e);
            console.log("test:", fixed);
            expect(fixed).not.toEqual(e);
            expect(proto.unfix(fixed)).toEqual(e);
        });
    });
});
