import { API } from "../src/api";
import { EventHandler } from "../src/events";
import { config, log } from "./fixtures";
import { Event, mark, Message, Room as ProtoRoom, typing } from "../src/protocol";
import { createRoom, Room } from "../src/room";

const roomId = "123";
const alice = "321";
const bob = "456";
const chad = "987";
const msg1 = "2323";
const msg2 = "1313";
const msg3 = "4545";

function msg(id: string): Message {
    return {
        id,
        body: "Hi!",
        sender: alice,
        room: roomId,
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
        return Promise.resolve([msg(msg1), msg(msg2)]);
    }

    getRoomUsers(id) {
        return Promise.resolve([bob]);
    }

    sendTyping(id) {
        this.sentTyping = true;
    }

    sendMessage(id, body) {
        let m = msg(msg3);
        m.body = body;
        return Promise.resolve(m);
    }

    setMark(id, timestamp) {
        this.marked = true;
    }
}

function makeRoom(direct = false) {
    return {
        id: roomId,
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
                expect(msg.user).toBe(chad);
                done();
            });

            events.notify(typing(room.id, chad));
        });

        it("should run a callback on incoming message", (done) => {
            room.onMessage((msg) => {
                expect(msg.sender).toBe(chad);
                done();
            });

            let m = msg(msg1);
            m.room = room.id;
            m.sender = chad;
            events.notify({
                type: "room_message",
                id: room.id,
                message: m
            } as Event);
        });

        it("should run a callback on incoming mark", (done) => {
            let t = Date.now();

            room.onMark((msg) => {
                expect(msg.timestamp).toBe(t);
                room.getMark().then((mark) => {
                    expect(mark).toBe(t);
                    done();
                });
            });

            events.notify(mark(room.id, t));
        });

        // FIXME These should be moved to integration tests:
        it("should retrieve history", (done) => {
            room.getHistory().then((msgs) => {
                let ids = msgs.map((m) => m.id);
                expect(ids).toContain(msg1);
                expect(ids).toContain(msg2);
                done();
            });
        });

        it("should retrieve users", (done) => {
            room.getUsers().then((users) => {
                expect(users).toContain(bob);
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

    it("should run callback on room joined", (done) => {
        room.onJoined((msg) => {
            expect(msg.user).toBe(alice);
            done();
        });

        events.notify({
            type: "room_joined",
            id: room.id,
            user: alice,
            timestamp: Date.now()
        } as Event);
    });

    it("should run callback on room left", (done) => {
        room.onLeft((msg) => {
            expect(msg.user).toBe(alice);
            expect(msg.reason).toBe("reason");
            done();
        });

        events.notify({
            type: "room_left",
            id: room.id,
            user: alice,
            reason: "reason",
            timestamp: Date.now()
        } as Event);
    });

    it("should run callback on room invite", (done) => {
        room.onInvited((msg) => {
            expect(msg.user).toBe(bob);
            expect(msg.inviter).toBe(alice);
            done();
        });

        events.notify({
            type: "room_invited",
            id: room.id,
            inviter: alice,
            user: bob,
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
        room.invite(chad);
        expect(api.invited).toBe(chad);
    });
});
