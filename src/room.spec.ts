import { ArtichokeAPI } from "./api";
import { EventHandler } from "./events";
import {apiKey, config, log, sessionId } from "./fixtures.spec";
import { Event } from "./protocol/events";
import * as proto from "./protocol/protocol";
import * as wireEntities from "./protocol/wire-entities";
import { actionTypes, codec, eventTypes, Invitee, marked, Reason, typing } from "./protocol/wire-events";
import { createRoom, DirectRoom, GroupRoom, Room, roomType } from "./room";

import RoomType = roomType.RoomType;

const actionId = "567";
const roomId = "123";
const alice = "321";
const bob = "456";
const chad = "987";
const msg1 = "2323";
const msg2 = "1313";
const msg3 = "4545";

function msg(id: string): wireEntities.Message {
  return {
    type: "message",
    id,
    body: "Hi!",
    tag: "TEXT_MESSAGE",
    context: {
      payload: "{\"key\": \"value\"}"
    },
    userId: alice,
    channel: roomId,
    timestamp: 123,
  };
}

class APIMock extends ArtichokeAPI {
  sentTyping = false;
  marked = false;
  joined = false;
  left = false;
  invited: string;

  constructor() {
    super(sessionId, apiKey, config.chat, log);
  }

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

  getRoomHistoryLast(id, count, filter) {
    return Promise.resolve({
      offset: 0,
      limit: 2,
      items: [msg(msg1), msg(msg2)]
    });
  }

  getRoomHistoryPage(id, offset, limit, filter) {
    return Promise.resolve({
      offset: 0,
      limit: 2,
      items: [msg(msg1), msg(msg2)]
    });
  }

  getRoomUsers(id) {
    return Promise.resolve([bob]);
  }

  sendTyping(id) {
    this.sentTyping = true;
    return Promise.resolve();
  }

  sendMessage(id, body) {
    let m = msg(msg3);
    m.body = body;
    return Promise.resolve(m);
  }

  setMark(id, timestamp) {
    this.marked = true;
    return Promise.resolve();
  }
}

function makeRoom(roomType: RoomType) {
  const room = {
    id: roomId,
    name: "room",
    created: 123,
    users: [alice],
    direct: false,
  } as wireEntities.Room;

  switch (roomType) {
    case RoomType.DIRECT:
      room.direct = true;
      return room;

    case RoomType.BUSINESS:
      room.orgId = "1234";
      return room;

    case RoomType.GROUP:
      return room;

    default:
      throw Error("invalid RoomType");
  }
}

["DirectRoom", "GroupRoom"].forEach((d) => {
  describe(d, () => {
    let events;
    let api;
    let room;
    let uid;

    beforeEach(() => {
      events = new EventHandler(log, codec);
      api = new APIMock();
      const roomType = d === "DirectRoom" ? RoomType.DIRECT : RoomType.GROUP;
      room = createRoom(makeRoom(roomType), log, events, api);
      uid = "123";
    });

    it("should maintain a high water mark", (done) => {
      room.getMark(sessionId).then((hwm) => {
        expect(hwm).toBe(0);

        let t = Date.now();
        room.setMark(t);

        expect(api.marked).toBe(true);

        room.getMark(sessionId).then((newHwm) => {
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

      events.notify(typing(room.id, chad, Date.now()));
    });

    it("should run a callback on incoming message", (done) => {
      room.onMessage((msg) => {
        expect(msg.userId).toBe(chad);
        done();
      });

      let m = msg(msg1);
      m.channel = room.id;
      m.userId = chad;
      events.notify({
        type: eventTypes.ROOM_MESSAGE,
        id: room.id,
        message: m
      } as Event);
    });

    it("should run a callback on incoming custom message", (done) => {
      room.onCustom("json", (msg) => {
        expect(msg.userId).toBe(chad);
        done();
      });

      let m = msg(msg1);
      m.tag = "json"
      m.channel = room.id;
      m.userId = chad;

      events.notify({
        type: eventTypes.ROOM_MESSAGE,
        id: room.id,
        message: m
      } as Event);
    });

    it("should run a callback on incoming mark", (done) => {
      let t = Date.now();

      room.onMark((msg) => {
        expect(msg.timestamp).toBe(t);
        room.getMark(uid).then((mark) => {
          expect(mark).toBe(t);
          done();
        });
      });

      events.notify(marked(room.id, uid, t));
    });

    // FIXME These should be moved to integration tests:
    it("should retrieve history", (done) => {
      room.getLatestMessages().then((msgs) => {
        let ids = msgs.items.map((m) => m.id);
        expect(ids).toContain(msg1);
        expect(ids).toContain(msg2);
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

describe("DirectRoom", () => {
  let events;
  let api;
  let room;

  beforeEach(() => {
    events = new EventHandler(log, codec);
    api = new APIMock();
    room = createRoom(makeRoom(RoomType.DIRECT), log, events, api) as DirectRoom;
  });

  it("should retrieve users", (done) => {
    room.getUsers().then((users) => {
      expect(users).toContain(bob);
      done();
    });
  });
});

describe("GroupRoom", () => {
  let events;
  let api;
  let room;

  beforeEach(() => {
    events = new EventHandler(log, codec);
    api = new APIMock();
    room = createRoom(makeRoom(RoomType.GROUP), log, events, api) as GroupRoom;
  });

  it("should maintain the user list", (done) => {
    events.onEvent(eventTypes.ERROR, (error) => done.fail());

    room.onJoined((joined) => {
      expect(joined.userId).toBe(bob);

      room.getUsers().then((users1) => {
        expect(users1).toContain(bob);
        expect(users1).toContain(alice);

        room.onLeft((left) => {
          expect(left.userId).toBe(alice);

          room.getUsers().then((users2) => {
            expect(users2).toContain(bob);
            expect(users2).not.toContain(alice);
            done();
          });
        });

        events.notify({
          type: eventTypes.ROOM_MESSAGE,
          id: room.id,
          message: {
            type: "message",
            tag: actionTypes.ROOM_LEFT,
            id: actionId,
            room: room.id,
            userId: alice,
            context: {
              reason: "no reason"
            },
            timestamp: Date.now()
          }
        } as Event);
      });
    });

    events.notify({
      type: eventTypes.ROOM_MESSAGE,
      id: room.id,
      message: {
        type: "message",
        tag: actionTypes.ROOM_JOINED,
        id: actionId,
        room: room.id,
        userId: bob,
        timestamp: Date.now()
      }
    } as Event);
  });

  it("should run callback on room joined", (done) => {
    room.onJoined((msg) => {
      expect(msg.userId).toBe(alice);
      done();
    });

    events.notify({
      type: eventTypes.ROOM_MESSAGE,
      id: room.id,
      message: {
        type: "message",
        tag: actionTypes.ROOM_JOINED,
        id: actionId,
        room: room.id,
        userId: alice,
        timestamp: Date.now()
      }
    } as Event);
  });

  it("should run callback on room left", (done) => {
    room.onLeft((msg) => {
      expect(msg.userId).toBe(alice);
      expect((msg.context as Reason).reason).toBe("reason");
      done();
    });

    events.notify({
      type: eventTypes.ROOM_MESSAGE,
      id: room.id,
      message: {
        type: "message",
        tag: actionTypes.ROOM_LEFT,
        id: actionId,
        room: room.id,
        userId: alice,
        context: {
          reason: "reason"
        },
        timestamp: Date.now()
      }
    } as Event);
  });

  it("should run callback on room invite", (done) => {
    room.onInvited((msg) => {
      expect(msg.userId).toBe(alice);
      expect((msg.context as Invitee).invitee).toBe(bob);
      done();
    });

    events.notify({
      type: eventTypes.ROOM_MESSAGE,
      id: room.id,
      message: {
        type: "message",
        tag: actionTypes.ROOM_INVITED,
        id: actionId,
        room: room.id,
        userId: alice,
        context: {
          invitee: bob
        },
        timestamp: Date.now()
      }
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

describe("GroupRoom, BusinessRoom, DirectRoom", () => {
  const events = new EventHandler(log, codec);
  const api = new APIMock();

  it("should have proper roomType field defined", (done) => {
    const businessRoom: Room = createRoom(makeRoom(RoomType.BUSINESS), log, events, api);
    const directRoom: Room = createRoom(makeRoom(RoomType.DIRECT), log, events, api);
    const groupRoom: Room = createRoom(makeRoom(RoomType.GROUP), log, events, api);
    expect(businessRoom.roomType).toEqual(RoomType.BUSINESS);
    expect(directRoom.roomType).toEqual(RoomType.DIRECT);
    expect(groupRoom.roomType).toEqual(RoomType.GROUP);
    done();
  });
});
