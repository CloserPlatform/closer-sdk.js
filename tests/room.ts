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

function room(direct = false) {
    return {
        id: "123",
        name: "room",
        direct: direct
    } as ProtoRoom;
}

["DirectRoom", "Room"].forEach((d) => {
    describe(d, () => {
        it("should retrieve history", (done) => {
            let events = new EventHandler(log);
            let api = new APIMock(config, log);
            let r = createRoom(room(d === "DirectRoom"), log, events, api);

            r.getHistory().then((msgs) => {
                let ids = msgs.map((m) => m.id);
                expect(ids).toContain("123");
                expect(ids).toContain("321");
                done();
            });
        });

        it("should retrieve users", (done) => {
            let events = new EventHandler(log);
            let api = new APIMock(config, log);
            let r = createRoom(room(d === "DirectRoom"), log, events, api);

            r.getUsers().then((users) => {
                expect(users).toContain("456");
                done();
            });
        });

        it("should allow typing indication", () => {
            let events = new EventHandler(log);
            let api = new APIMock(config, log);
            let r = createRoom(room(d === "DirectRoom"), log, events, api);

            r.indicateTyping();

            expect(api.sentTyping).toBe(true);
        });

        it("should allow sending messages", (done) => {
            let events = new EventHandler(log);
            let api = new APIMock(config, log);
            let r = createRoom(room(d === "DirectRoom"), log, events, api);

            r.send("hello").then((msg) => {
                expect(msg.body).toBe("hello");
                done();
            });
        });

        it("should maintain a high water mark", (done) => {
            let events = new EventHandler(log);
            let api = new APIMock(config, log);
            let r = createRoom(room(d === "DirectRoom"), log, events, api);

            r.getMark().then((hwm) => {
                expect(hwm).toBe(0);

                let t = Date.now();
                r.mark(t);

                expect(api.marked).toBe(true);

                r.getMark().then((newHwm) => {
                    expect(newHwm).toBe(t);
                    done();
                });
            });
        });

        it("should run a callback on typing indication", (done) => {
            let events = new EventHandler(log);
            let api = new APIMock(config, log);
            let r = createRoom(room(d === "DirectRoom"), log, events, api);

            r.onTyping((msg) => {
                expect(msg.user).toBe("987");
                done();
            });

            events.notify({
                type: "typing",
                id: r.id,
                user: "987"
            } as Event);
        });

        it("should run a callback on incoming message", (done) => {
            let events = new EventHandler(log);
            let api = new APIMock(config, log);
            let r = createRoom(room(d === "DirectRoom"), log, events, api);

            r.onMessage((msg) => {
                expect(msg.sender).toBe("987");
                done();
            });

            let m = msg("123");
            m.room = r.id;
            m.sender = "987";
            events.notify(m as Event);
        });
    });
});

describe("Room", () => {
    it("should allow joining", () => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let r = createRoom(room(), log, events, api) as Room;

        r.join();

        expect(api.joined).toBe(true);
    });

    it("should allow leaving", () => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let r = createRoom(room(), log, events, api) as Room;

        r.leave();

        expect(api.left).toBe(true);
    });

    it("should allow inviting others", () => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let r = createRoom(room(), log, events, api) as Room;

        r.invite("567");

        expect(api.invited).toBe("567");
    });

    it("should run callback on room actions", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let r = createRoom(room(), log, events, api) as Room;

        r.onAction((msg) => {
            expect(msg.originator).toBe("333");
            done();
        });

        events.notify({
            type: "room_action",
            originator: "333",
            id: r.id,
            action: "left",
            timestamp: Date.now()
        } as Event);
    });
});
