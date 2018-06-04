// tslint:disable:max-file-line-count
import { EventHandler } from '../events/event-handler';
import { apiKeyMock, config, log, sessionIdMock } from '../test-utils';
import { chatEvents } from '../protocol/events/chat-events';
import { decoder } from '../protocol/events/domain-event';
import { errorEvents } from '../protocol/events/error-events';
import { roomEvents } from '../protocol/events/room-events';
import * as wireEntities from '../protocol/wire-entities';
import NormalizedEvent = chatEvents.NormalizedEvent;
import EndReason = roomEvents.EndReason;
import { ArtichokeAPI } from '../apis/artichoke-api';
import { RoomType } from './room-type';
import { Room } from './room';
import { DirectRoom } from './direct-room';
import { GroupRoom } from './group-room';
import { createRoom } from './create-room';
import { Paginated } from '../protocol/protocol';
import MessageSent = roomEvents.MessageSent;

const roomId = '123';
const alice = '321';
const bob = '456';
const chad = '987';
const msg1 = '2323';
const msg2 = '1313';
const msg3 = '4545';

function msgFn(id: string, body?: string): roomEvents.MessageSent {
  return new roomEvents.MessageSent(roomId, alice, body ? body : 'Hi!', id, {}, 123);
}

class APIMock extends ArtichokeAPI {
  public sentTyping = false;
  public marked = false;
  public joined = false;
  public left = false;
  public invited: string;

  constructor() {
    super(sessionIdMock, apiKeyMock, config.chat, log);
  }

  public joinRoom(id): Promise<void> {
    this.joined = true;

    return Promise.resolve();
  }

  public leaveRoom(id): Promise<void> {
    this.left = true;

    return Promise.resolve();
  }

  public inviteToRoom(id, user): Promise<void> {
    this.invited = user;

    return Promise.resolve();
  }

  public getRoomHistoryLast(id, count, filter): Promise<Paginated<MessageSent>> {
    return Promise.resolve({
      offset: 0,
      limit: 2,
      items: [msgFn(msg1), msgFn(msg2)]
    });
  }

  public getRoomHistoryPage(id, offset, limit, filter): Promise<Paginated<MessageSent>> {
    return Promise.resolve({
      offset: 0,
      limit: 2,
      items: [msgFn(msg1), msgFn(msg2)]
    });
  }

  public getRoomUsers(id): Promise<string[]> {
    return Promise.resolve([bob]);
  }

  public sendTyping(id): Promise<void> {
    this.sentTyping = true;

    return Promise.resolve();
  }

  public sendMessage(id, body): Promise<chatEvents.Received> {
    const m = msgFn(msg3, body);
    const n: NormalizedEvent = {
      id: m.messageId,
      authorId: m.authorId,
      channelId: m.roomId,
      tag: m.tag,
      data: {message: m.message},
      timestamp: m.timestamp,
    };

    return Promise.resolve(new chatEvents.Received(m.messageId, n));
  }

  public setMark(id, timestamp): Promise<void> {
    this.marked = true;

    return Promise.resolve();
  }
}

function makeRoom(type: RoomType): wireEntities.Room {
  const room: wireEntities.Room = {
    id: roomId,
    name: 'room',
    created: 123,
    users: [alice],
    direct: false,
    marks: {}
  };

  switch (type) {
    case RoomType.DIRECT:
      room.direct = true;

      return room;

    case RoomType.BUSINESS:
      room.orgId = '1234';

      return room;

    case RoomType.GROUP:
      return room;

    default:
      throw Error('invalid RoomType');
  }
}

['DirectRoom', 'GroupRoom'].forEach((d) => {
  describe(d, () => {
    let events: EventHandler;
    let api: APIMock;
    let room: Room;
    let uid;

    beforeEach(() => {
      events = new EventHandler(log, decoder);
      api = new APIMock();
      const type = d === 'DirectRoom' ? RoomType.DIRECT : RoomType.GROUP;
      room = createRoom(makeRoom(type), log, events, api);
      uid = '123';
    });

    it('should maintain a high water mark', (done) => {
      room.getMark(sessionIdMock).then((hwm) => {
        expect(hwm).toBe(0);

        const t = Date.now();
        room.setMark(t);

        expect(api.marked).toBe(true);

        room.getMark(sessionIdMock).then((newHwm) => {
          expect(newHwm).toBe(t);
          done();
        });
      });
    });

    it('should run a callback on typing indication', (done) => {
      room.onTyping((msg) => {
        expect(msg.authorId).toBe(chad);
        done();
      });

      events.notify(new roomEvents.TypingSent(room.id, chad, Date.now()));
    });

    it('should run a callback on incoming message', (done) => {
      room.onMessage((msg) => {
        expect(msg.authorId).toBe(chad);
        done();
      });

      const m = new roomEvents.MessageSent(roomId, chad, 'Hi!', msg1, {}, 123);
      events.notify(m);
    });

    it('should run a callback on incoming custom message', (done) => {
      room.onCustom('json', (msg) => {
        expect(msg.authorId).toBe(chad);
        done();
      });

      const m = new roomEvents.CustomMessageSent(roomId, chad, 'Hi!', msg1, 'json', {}, 123);
      events.notify(m);
    });

    it('should run a callback on incoming mark', (done) => {
      const t = Date.now();

      room.onMarked((msg) => {
        expect(msg.timestamp).toBe(t);
        room.getMark(uid).then((mark) => {
          expect(mark).toBe(t);
          done();
        });
      });

      events.notify(new roomEvents.MarkSent(room.id, uid, t));
    });

    // FIXME These should be moved to integration tests:
    it('should retrieve history', (done) => {
      room.getLatestMessages().then((msgs) => {
        const ids = msgs.items.map((m: roomEvents.MessageSent) => m.messageId);
        expect(ids).toContain(msg1);
        expect(ids).toContain(msg2);
        done();
      });
    });

    it('should allow typing indication', () => {
      room.indicateTyping();

      expect(api.sentTyping).toBe(true);
    });

    it('should allow sending messages', (done) => {
      room.send('hello').then((msg) => {
        // tslint:disable-next-line:no-any
        expect((msg.message.data as any).message).toBe('hello');
        done();
      });
    });
  });
});

describe('DirectRoom', () => {
  let events;
  let api;
  let room;

  beforeEach(() => {
    events = new EventHandler(log, decoder);
    api = new APIMock();
    room = createRoom(makeRoom(RoomType.DIRECT), log, events, api) as DirectRoom;
  });

  it('should retrieve users', (done) => {
    room.getUsers().then((users) => {
      expect(users).toContain(bob);
      done();
    });
  });
});

describe('GroupRoom', () => {
  let events: EventHandler;
  let api: APIMock;
  let room: GroupRoom;

  beforeEach(() => {
    events = new EventHandler(log, decoder);
    api = new APIMock();
    room = createRoom(makeRoom(RoomType.GROUP), log, events, api) as GroupRoom;
  });

  it('should maintain the user list', (done) => {
    events.onEvent(errorEvents.Error.tag, (error) => done.fail());

    room.onJoined((joined) => {
      expect(joined.authorId).toBe(bob);

      room.getUsers().then((users1) => {
        expect(users1).toContain(bob);
        expect(users1).toContain(alice);

        room.onLeft((left) => {
          expect(left.authorId).toBe(alice);

          room.getUsers().then((users2) => {
            expect(users2).toContain(bob);
            expect(users2).not.toContain(alice);
            done();
          });
        });

        events.notify(new roomEvents.Left(room.id, alice, EndReason.Terminated, Date.now()));
      });
    });

    events.notify(new roomEvents.Joined(room.id, bob, Date.now()));
  });

  it('should run callback on room joined', (done) => {
    room.onJoined((msg) => {
      expect(msg.authorId).toBe(alice);
      done();
    });

    events.notify(new roomEvents.Joined(room.id, alice, Date.now()));
  });

  it('should run callback on room left', (done) => {
    room.onLeft((msg) => {
      expect(msg.authorId).toBe(alice);
      expect(msg.endReason).toBe(EndReason.Terminated);
      done();
    });

    events.notify(new roomEvents.Left(room.id, alice, EndReason.Terminated, Date.now()));
  });

  it('should run callback on room invite', (done) => {
    room.onInvited((msg) => {
      expect(msg.authorId).toBe(alice);
      expect(msg.invitee).toBe(bob);
      done();
    });

    events.notify(new roomEvents.Invited(room.id, alice, bob, Date.now()));
  });

  // FIXME These should be moved to integration tests:
  it('should allow joining', () => {
    room.join();
    expect(api.joined).toBe(true);
  });

  it('should allow leaving', () => {
    room.leave();
    expect(api.left).toBe(true);
  });

  it('should allow inviting others', () => {
    room.invite(chad);
    expect(api.invited).toBe(chad);
  });
});

describe('GroupRoom, BusinessRoom, DirectRoom', () => {
  const events = new EventHandler(log, decoder);
  const api = new APIMock();

  it('should have proper roomType field defined', (done) => {
    const businessRoom: Room = createRoom(makeRoom(RoomType.BUSINESS), log, events, api);
    const directRoom: Room = createRoom(makeRoom(RoomType.DIRECT), log, events, api);
    const groupRoom: Room = createRoom(makeRoom(RoomType.GROUP), log, events, api);
    expect(businessRoom.roomType).toEqual(RoomType.BUSINESS);
    expect(directRoom.roomType).toEqual(RoomType.DIRECT);
    expect(groupRoom.roomType).toEqual(RoomType.GROUP);
    done();
  });
});
