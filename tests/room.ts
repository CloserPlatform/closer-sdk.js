import { API } from "../src/api";
import { EventHandler } from "../src/events";
import { config, log } from "./fixtures";
import { Event, Message, Room as ProtoRoom } from "../src/protocol";
import { createRoom, Room } from "../src/room";

function msg(id: string): Message {
    return {
        type: "message",
        id,
        body: "Hi!",
        sender: "bob",
        room: "123",
        timestamp: 123,
    };
}

class APIMock extends API {
    sentTyping = false;
    marked = false;
    joined = false;
    left = false;
    invited: string;

    joinRoom(id) {
        this.joined = true;
        return Promise.resolve();
    }

    leaveRoom(id) {
        this.left = true;
        return Promise.resolve();
    }

    inviteToRoom(id, user) {
        this.invited = user;
        return Promise.resolve();
    }

    getRoomHistory(id) {
        return Promise.resolve([msg("123"), msg("321")]);
    }

    getRoomUsers(id) {
        return Promise.resolve(["456"]);
    }

    sendTyping(id) {
        this.sentTyping = true;
    }

    sendMessage(id, body) {
        let m = msg("987");
        m.body = body;
        return Promise.resolve(m);
    }

    setMark(id, timestamp) {
        this.marked = true;
    }
}

function makeRoom(direct = false) {
    return {
        id: "123",
        name: "room",
        direct: direct
    } as ProtoRoom;
}

["DirectRoom", "Room"].forEach((d) => {
    describe(d, () => {
        let events, api, room;

        beforeEach(() => {
            events = new EventHandler(log);
            api = new APIMock(config, log);
            room = createRoom(makeRoom(d === "DirectRoom"), log, events, api);
        });

        it("should maintain a high water mark", (done) => {
            room.getMark().then((hwm) => {
                expect(hwm).toBe(0);

                let t = Date.now();
                room.mark(t);

                expect(api.marked).toBe(true);

                room.getMark().then((newHwm) => {
                    expect(newHwm).toBe(t);
                    done();
                });
            });
        });

        it("should run a callback on typing indication", (done) => {
            room.onTyping((msg) => {
                expect(msg.user).toBe("987");
                done();
            });

            events.notify({
                type: "typing",
                id: room.id,
                user: "987"
            } as Event);
        });

        it("should run a callback on incoming message", (done) => {
            room.onMessage((msg) => {
                expect(msg.sender).toBe("987");
                done();
            });

            let m = msg("123");
            m.room = room.id;
            m.sender = "987";
            events.notify(m as Event);
        });

        // FIXME These should be moved to integration tests:
        it("should retrieve history", (done) => {
            room.getHistory().then((msgs) => {
                let ids = msgs.map((m) => m.id);
                expect(ids).toContain("123");
                expect(ids).toContain("321");
                done();
            });
        });

        it("should retrieve users", (done) => {
            room.getUsers().then((users) => {
                expect(users).toContain("456");
                done();
            });
        });

        it("should allow typing indication", () => {
            room.indicateTyping();

            expect(api.sentTyping).toBe(true);
        });

        it("should allow sending messages", (done) => {
            room.send("hello").then((msg) => {
                expect(msg.body).toBe("hello");
                done();
            });
        });
    });
});

describe("Room", () => {
    let events, api, room;

    beforeEach(() => {
        events = new EventHandler(log);
        api = new APIMock(config, log);
        room = createRoom(makeRoom(), log, events, api) as Room;
    });

    it("should run callback on room actions", (done) => {
        room.onAction((msg) => {
            expect(msg.originator).toBe("333");
            done();
        });

        events.notify({
            type: "room_action",
            originator: "333",
            id: room.id,
            action: "left",
            timestamp: Date.now()
        } as Event);
    });

    // FIXME These should be moved to integration tests:
    it("should allow joining", () => {
        room.join();
        expect(api.joined).toBe(true);
    });

    it("should allow leaving", () => {
        room.leave();
        expect(api.left).toBe(true);
    });

    it("should allow inviting others", () => {
        room.invite("567");
        expect(api.invited).toBe("567");
    });
});
