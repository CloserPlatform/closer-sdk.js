import { Room as wireRoom } from '../../../src/protocol/wire-entities';
import { getLoggerServiceMock } from '../../mocks/logger.mock';
import { getArtichokeApiMock } from '../../mocks/artichoke-api.mock';
import { BusinessRoom, Room, roomEvents } from '../../../src';
import { of } from 'rxjs';
import EndReason = roomEvents.EndReason;

const roomEvent: wireRoom = {
  id: 'id',
  name: 'name',
  created: 1,
  direct: false,
  orgId: 'orgId',
  users: ['userId'],
  marks: {}
};

const getRoom = (api = getArtichokeApiMock()): BusinessRoom =>
  new BusinessRoom(
    roomEvent,
    getLoggerServiceMock(),
    api,
  );

describe('Unit: BusinessRoom', () => {

  it('join', () => {
    const api = getArtichokeApiMock();
    spyOn(api, 'joinRoom');
    const room = getRoom(api);
    room.join();
    expect(api.joinRoom).toHaveBeenCalledWith(roomEvent.id);
  });

  it('leave', () => {
    const api = getArtichokeApiMock();
    spyOn(api, 'leaveRoom');
    const room = getRoom(api);
    room.leave();
    expect(api.leaveRoom).toHaveBeenCalledWith(roomEvent.id);
  });

  it('invite', () => {
    const api = getArtichokeApiMock();
    spyOn(api, 'inviteToRoom');
    const room = getRoom(api);
    const userId = 'userId';
    room.invite(userId);
    expect(api.inviteToRoom).toHaveBeenCalledWith(roomEvent.id, userId);
  });

  it('invited$', done => {
    const api = getArtichokeApiMock();
    const event = new roomEvents.Invited(roomEvent.id, 'authorId', 'invitee', 1);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const room = getRoom(api);
    room.invited$.subscribe(inv => {
      expect(inv).toBe(event);
      done();
    }, done.fail);
  });

  it('joined$', done => {
    const api = getArtichokeApiMock();
    const event = new roomEvents.Joined(roomEvent.id, 'authorId', 1);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const room = getRoom(api);
    room.joined$.subscribe(inv => {
      expect(inv).toBe(event);
      done();
    }, done.fail);
  });

  it('left$', done => {
    const api = getArtichokeApiMock();
    const event = new roomEvents.Left(roomEvent.id, 'authorId', EndReason.Ended, 1);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const room = getRoom(api);
    room.left$.subscribe(inv => {
      expect(inv).toBe(event);
      done();
    }, done.fail);
  });

  it('getUsers', async () => {
    const api = getArtichokeApiMock();
    spyOn(api, 'getRoomUsers').and.returnValue(Promise.resolve(roomEvent.users));
    const room = getRoom(api);
    const users = await room.getUsers();
    expect(users).toBe(roomEvent.users);
    expect(api.getRoomUsers).toHaveBeenCalledWith(roomEvent.id);
  });

  describe('mark', () => {
    it('get cached mark for not existing', () => {
      const api = getArtichokeApiMock();
      const room = getRoom(api);
      const mark = room.getCachedMark('userId');
      expect(mark).toBe(0);
    });

    it('set should cache changes', () => {
      const api = getArtichokeApiMock();
      const room = getRoom(api);
      spyOn(api, 'setMark');
      const timestamp = Date.now();
      room.setMark(timestamp);
      expect(api.setMark).toHaveBeenCalledWith(roomEvent.id, timestamp);
      const cachedMark = room.getCachedMark(api.sessionId);
      expect(cachedMark).toBe(timestamp);
    });

    it('get cached mark which was set remotely', () => {
      const api = getArtichokeApiMock();
      const userId = 'userId';
      const timestamp = 123;
      const event = new roomEvents.MarkSent(roomEvent.id, userId, timestamp);
      spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
      const room = getRoom(api);
      const mark = room.getCachedMark(userId);
      expect(mark).toBe(timestamp);
    });
  });

  it('setDelivered', async () => {
    const oldDate = Date.now;
    const timestamp = 123;
    spyOn(Date, 'now').and.returnValue(timestamp);
    const api = getArtichokeApiMock();
    spyOn(api, 'setDelivered');
    const room = getRoom(api);
    const messageId = 'messageId';
    room.setDelivered(messageId);
    expect(api.setDelivered).toHaveBeenCalledWith(roomEvent.id, messageId, timestamp);
    Date.now = oldDate;
  });

  it('send', async () => {
    const api = getArtichokeApiMock();
    spyOn(api, 'sendMessage');
    const room = getRoom(api);
    const message = 'body';
    const context = {test: 'context'};
    room.send(message, context);
    expect(api.sendMessage).toHaveBeenCalledWith(roomEvent.id, message, context);
  });

  it('sendCustom', async () => {
    const api = getArtichokeApiMock();
    spyOn(api, 'sendCustom');
    const room = getRoom(api);
    const message = 'body';
    const subtag = 'subtag';
    const context = 'context';
    room.sendCustom(message, subtag, context);
    expect(api.sendCustom).toHaveBeenCalledWith(roomEvent.id, message, subtag, context);
  });

  it('indicateTyping', async () => {
    const api = getArtichokeApiMock();
    spyOn(api, 'sendTyping');
    const room = getRoom(api);
    room.indicateTyping();
    expect(api.sendTyping).toHaveBeenCalledWith(roomEvent.id);
  });

  it('message$', async done => {
    const api = getArtichokeApiMock();
    const event = new roomEvents.MessageSent(roomEvent.id, 'authorId', 'message', 'messageId', {}, 1);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const room = getRoom(api);
    room.message$.subscribe(message => {
      expect(message).toBe(event);
      done();
    }, done.fail);
  });

  it('messageDelivered$', async done => {
    const api = getArtichokeApiMock();
    const event = new roomEvents.MessageDelivered(roomEvent.id, 'authorId',  'messageId', 1);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const room = getRoom(api);
    room.messageDelivered$.subscribe(message => {
      expect(message).toBe(event);
      done();
    }, done.fail);
  });

  it('messageDelivered$', async done => {
    const api = getArtichokeApiMock();
    const event = new roomEvents.CustomMessageSent(roomEvent.id, 'authorId',  'message', 'messageId', 'subtag', {}, 1);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const room = getRoom(api);
    room.customMessage$.subscribe(message => {
      expect(message).toBe(event);
      done();
    }, done.fail);
  });

  it('typing$', async done => {
    const api = getArtichokeApiMock();
    const event = new roomEvents.TypingSent(roomEvent.id, 'authorId', 1);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const room = getRoom(api);
    room.typing$.subscribe(message => {
      expect(message).toBe(event);
      done();
    }, done.fail);
  });

  it('getCustomMessageStream', async done => {
    const api = getArtichokeApiMock();
    const subtag = 'subtag';
    const event = new roomEvents.CustomMessageSent(roomEvent.id, 'authorId', 'message', 'messageId', subtag, {}, 1);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const room = getRoom(api);
    room.customSubtagMessage$(subtag).subscribe(message => {
      expect(message).toBe(event);
      done();
    }, done.fail);
  });

  it('getLatestMessages', () => {
    const api = getArtichokeApiMock();
    const room = getRoom(api);
    spyOn(api, 'getRoomHistoryLast');
    room.getLatestMessages();
    expect(api.getRoomHistoryLast).toHaveBeenCalledWith(roomEvent.id, Room.defaultRoomCount, undefined);
  });

  it('getMessages', () => {
    const api = getArtichokeApiMock();
    const room = getRoom(api);
    spyOn(api, 'getRoomHistoryPage');
    const offset = 10;
    const limit = 20;
    room.getMessages(offset, limit);
    expect(api.getRoomHistoryPage).toHaveBeenCalledWith(roomEvent.id, offset, limit, undefined);
  });
});
