// tslint:disable:max-file-line-count
import { callEvents, CallType, errorEvents, Artichoke, roomEvents, RoomType, serverEvents, externalEvents } from '../../../src';
import { getArtichokeApiMock } from '../../mocks/artichoke-api.mock';
import { getCallFactoryMock } from '../call/call-factory.spec';
import { getRoomFactory } from '../room/room-factory.spec';
import { getLoggerServiceMock } from '../../mocks/logger.mock';
import * as wireEntities from './../../../src/protocol/wire-entities';
import { getConfigMock } from '../../mocks/config.mock';
import { Observable, of, Subject } from 'rxjs';
import { ArtichokeMessage } from '../../../src/protocol/artichoke-message';

const sessionId = 'sessionId';
const peerId = 'peerId';
const pushId = 'pushId';
const callId = 'callId';
const userId = 'userId';
const adviserId = 'callId';
const authorId = 'callId';
const roomId = 'roomId';
const requesterId = 'requesterId';
const customerId = 'customerId';
const messageId = 'messageId';
const locale = 'en-US';
const zoneId = 'zone';
const timestamp = 123456;
const duration = 10;
const meetingId = 'meetingId';
const start = 0;
const guestId = 'guestId';
const guestName = 'guestName';
const minutesToMeeting = 5;
const langTag = 'langTag';
const backOfficeData = [{key: 'key', value: 'value'}];
const tags = ['guest', 'tag'];

const upcomingMeeting: externalEvents.UpcomingMeeting = {
  duration, guestId, guestName, langTag, meetingId, minutesToMeeting, roomId, start
};

const groupCallEvent: wireEntities.Call = {
  id: 'id', created: 1, creator: 'creator', direct: false, users: [userId], invitees: []
};
const directCallEvent = {...groupCallEvent, direct: true};
const businessCallEvent = {...groupCallEvent, orgId: 'orgId'};

const groupRoomEvent: wireEntities.Room = {
  id: 'id', name: 'name', created: 1, direct: false, users: [], marks: {}
};

const directRoomEvent = {...groupRoomEvent, direct: true};
const businessRoomEvent = {...groupRoomEvent, orgId: 'orgId'};

const hbTimeout = 2000;
const reconnectDelayMs = 1000;
const helloEvent = new serverEvents.Hello('deviceId', 1, hbTimeout, reconnectDelayMs);

const getHeartbeatTimeout = (): number =>
  hbTimeout * getConfigMock().artichoke.heartbeatTimeoutMultiplier;

const getFakeConnection$ = (events: ReadonlyArray<ArtichokeMessage>): Observable<ArtichokeMessage> =>
  new Observable<ArtichokeMessage>((sub): void => events.forEach(event => sub.next(event)));

export const getArtichoke = (api = getArtichokeApiMock()): Artichoke =>
  new Artichoke(
    api,
    getCallFactoryMock(),
    getRoomFactory(),
    getLoggerServiceMock(),
    getConfigMock().artichoke.heartbeatTimeoutMultiplier,
    getConfigMock().artichoke.fallbackReconnectDelayMs
  );

describe('Unit: Artichoke', () => {
  it('connect$', done => {
    const api = getArtichokeApiMock();
    spyOnProperty(api, 'connection$', 'get').and.returnValue(of(helloEvent));
    const client = getArtichoke(api);
    client.connection$.subscribe(done, done.fail);
  });

  describe('serverUnreachable$', () => {
    it('emit after timeout', done => {
      jasmine.clock().install();
      const api = getArtichokeApiMock();
      spyOnProperty(api, 'connection$', 'get').and.returnValue(getFakeConnection$([helloEvent]));
      const client = getArtichoke(api);
      client.serverUnreachable$.subscribe(done, done.fail);
      client.connection$.subscribe();
      jasmine.clock().tick(getHeartbeatTimeout());
      jasmine.clock().uninstall();
    });

    it('not emit before timeout', done => {
      const api = getArtichokeApiMock();
      spyOnProperty(api, 'connection$', 'get').and.returnValue(getFakeConnection$([helloEvent]));
      const client = getArtichoke(api);
      client.serverUnreachable$.subscribe(() => done.fail(), done.fail);
      jasmine.clock().install();
      client.connection$.subscribe();
      jasmine.clock().tick(getHeartbeatTimeout() - 1);
      jasmine.clock().uninstall();
      done();
    });

    it('not emit after timeout if heartbeat received', done => {
      const api = getArtichokeApiMock();
      spyOn(api, 'sendHeartbeat');
      const subject = new Subject<ArtichokeMessage>();
      spyOnProperty(api, 'connection$', 'get').and.returnValue(subject);
      const client = getArtichoke(api);
      jasmine.clock().install();
      client.serverUnreachable$.subscribe(() => done.fail(), done.fail);
      client.connection$.subscribe();
      subject.next(helloEvent);
      jasmine.clock().tick(getHeartbeatTimeout() - 1);
      expect(api.sendHeartbeat).not.toHaveBeenCalled();
      subject.next(new serverEvents.OutputHeartbeat(Date.now()));
      expect(api.sendHeartbeat).toHaveBeenCalled();
      jasmine.clock().tick(getHeartbeatTimeout() - 1);
      jasmine.clock().uninstall();
      done();
    });
  });

  it('error$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const reason = 'test';
    const event = new errorEvents.Error(reason);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.error$.subscribe(err => {
      expect(err.reason).toBe(reason);
      done();
    }, done.fail);
  });

  describe('connection$', () => {
    it('connect on hello', done => {
      const api = getArtichokeApiMock();
      spyOnProperty(api, 'connection$', 'get').and.returnValue(of(helloEvent));
      const client = getArtichoke(api);
      client.connection$.subscribe(done, done.fail);
    });

    it('not connect on other event hello', done => {
      const api = getArtichokeApiMock();
      const client = getArtichoke(api);
      const event = new serverEvents.OutputHeartbeat(Date.now());
      spyOnProperty(api, 'connection$', 'get').and.returnValue(of(event));
      client.connection$.subscribe(() => done.fail('Connected correctly'), done.fail);
      done();
    });

    it('connection end should emit disconnect$', done => {
      const api = getArtichokeApiMock();
      const client = getArtichoke(api);
      client.disconnect$.subscribe(done, done.fail);
      spyOnProperty(api, 'connection$', 'get').and.returnValue(getFakeConnection$([helloEvent]));
      const obs = client.connection$.subscribe();
      obs.unsubscribe();
    });

    it('unsuccessful connect should emit disconnect$', done => {
      const api = getArtichokeApiMock();
      const client = getArtichoke(api);
      const event = new serverEvents.OutputHeartbeat(Date.now());
      spyOnProperty(api, 'connection$', 'get').and.returnValue(of(event));
      client.disconnect$.subscribe(done, done.fail);
      client.connection$.subscribe(() => done.fail('Connected correctly'), done.fail);
    });
  });

  describe('reconnect', () => {
    it('should try to reconnect after delay', done => {
      const subject = new Subject<ArtichokeMessage>();
      const api = getArtichokeApiMock();
      spyOnProperty(api, 'connection$', 'get').and.returnValue(subject);
      const client = getArtichoke(api);
      const connectSubscription = jasmine.createSpy('connection$');
      const disconnectSubscription = jasmine.createSpy('disconnect$');
      jasmine.clock().install();

      client.connection$.subscribe(connectSubscription, done.fail, done.fail);
      subject.next(helloEvent);
      expect(connectSubscription).toHaveBeenCalled();

      client.disconnect$.subscribe(disconnectSubscription);
      subject.error('mock connection failure');

      const oneTimeBecauseConnectionFailure = 1;
      const twoTimesBecauseOfUnsuccessfullReconnect = 2;

      jasmine.clock().tick(reconnectDelayMs - 1);
      expect(disconnectSubscription).toHaveBeenCalledTimes(oneTimeBecauseConnectionFailure);
      jasmine.clock().tick(1);
      expect(disconnectSubscription).toHaveBeenCalledTimes(twoTimesBecauseOfUnsuccessfullReconnect);

      jasmine.clock().uninstall();
      done();
    });

    it('should update its reconnect delay from new hello event', done => {
      const firstDelay = 2137;
      const firstHello = new serverEvents.Hello('id', 1, 1, firstDelay);
      // tslint:disable-next-line: no-magic-numbers
      const secondHello = new serverEvents.Hello('id', 1, 1, firstDelay * 2);
      const subject = new Subject<ArtichokeMessage>();
      const api = getArtichokeApiMock();
      spyOnProperty(api, 'connection$', 'get').and.returnValue(subject);
      const client = getArtichoke(api);
      const connectSubscription = jasmine.createSpy('connection$');
      const disconnectSubscription = jasmine.createSpy('disconnect$');
      jasmine.clock().install();

      client.connection$.subscribe(connectSubscription, done.fail, done.fail);
      subject.next(firstHello);
      subject.next(secondHello);
      expect(connectSubscription).toHaveBeenCalled();

      client.disconnect$.subscribe(disconnectSubscription);
      subject.error('mock connection failure');

      const oneTimeBecauseUpdatedTimeoutNotYetCompleted = 1;
      const twoTimesBecauseUpdatedTimeoutCompleted = 2;

      jasmine.clock().tick(firstDelay);
      expect(disconnectSubscription).toHaveBeenCalledTimes(oneTimeBecauseUpdatedTimeoutNotYetCompleted);
      jasmine.clock().tick(firstDelay);
      expect(disconnectSubscription).toHaveBeenCalledTimes(twoTimesBecauseUpdatedTimeoutCompleted);

      jasmine.clock().uninstall();
      done();
    });
  });

  describe('disconnect', () => {
    it('clear timeout', done => {
      const api = getArtichokeApiMock();
      const client = getArtichoke(api);
      client.serverUnreachable$.subscribe(() => done.fail(), done.fail);
      jasmine.clock().install();
      spyOnProperty(api, 'connection$', 'get').and.returnValue(getFakeConnection$([helloEvent]));
      const obs = client.connection$.subscribe();
      obs.unsubscribe();
      jasmine.clock().tick(getHeartbeatTimeout());
      jasmine.clock().uninstall();
      done();
    });
  });

  it('callInvitation$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new callEvents.Invited(groupCallEvent.id, groupCallEvent.creator, sessionId, 1);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    spyOn(api, 'getCall').and.returnValue(Promise.resolve(groupCallEvent));
    client.callInvitation$.subscribe(inv => {
      expect(inv.callId).toBe(groupCallEvent.id);
      done();
    }, done.fail);
  });

  it('createDirectCall', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'createDirectCall').and.returnValue(Promise.resolve(directCallEvent));
    try {
      const directCall = await client.createDirectCall([], peerId);
      expect(directCall.id).toBe(directCallEvent.id);
      expect(directCall.callType).toBe(CallType.DIRECT);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('getActiveCall', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'getActiveCalls').and.returnValue(Promise.resolve([businessCallEvent]));
    try {
      const calls = await client.getActiveCalls();
      expect(calls).toBeDefined();
      if (calls) {
        expect(calls[0].id).toBe(businessCallEvent.id);
        done();
      }
    } catch (e) {
      done.fail(e);
    }
  });

  it('getActiveCall return empty arr for no calls', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'getActiveCalls').and.returnValue(Promise.resolve([]));
    try {
      const calls = await client.getActiveCalls();
      expect(calls).toEqual([]);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('getCallWithPendingInvitation', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'getCallsWithPendingInvitations').and.returnValue(Promise.resolve([businessCallEvent]));
    try {
      const calls = await client.getCallsWithPendingInvitations();
      expect(calls).toBeDefined();
      if (calls) {
        expect(calls[0].id).toBe(businessCallEvent.id);
        done();
      }
    } catch (e) {
      done.fail(e);
    }
  });

  it('getCallWithPendingInvitation return empty arr for no calls', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'getCallsWithPendingInvitations').and.returnValue(Promise.resolve([]));
    try {
      const calls = await client.getCallsWithPendingInvitations();
      expect(calls).toEqual([]);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('roomInvitation$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const invitee = 'invitee';
    const timestamp = 123;
    const event = new roomEvents.Invited(roomId, authorId, invitee, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.roomInvitation$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      expect(ev.authorId).toBe(authorId);
      expect(ev.invitee).toBe(invitee);
      expect(ev.timestamp).toBe(timestamp);
      done();
    }, done.fail);
  });

  it('callCreated$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const timestamp = 123;
    const event = new callEvents.Created(callId, authorId, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.callCreated$.subscribe(ev => {
      expect(ev.callId).toBe(callId);
      expect(ev.authorId).toBe(authorId);
      expect(ev.timestamp).toBe(timestamp);
      done();
    }, done.fail);
  });

  it('allFollowersRemoved$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.AllFollowersRemoved(roomId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.allFollowersRemoved$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      done();
    }, done.fail);
  });

  it('assigneeRemoved$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.AssigneeRemoved(adviserId, roomId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.assigneeRemoved$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      expect(ev.adviserId).toBe(adviserId);
      expect(ev.timestamp).toBeUndefined();
      done();
    }, done.fail);
  });

  it('assigneeChanged$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.AssigneeChanged(adviserId, roomId, requesterId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.assigneeChanged$.subscribe(ev => {
      expect(ev.adviserId).toBe(adviserId);
      expect(ev.roomId).toBe(roomId);
      expect(ev.requesterId).toBe(requesterId);
      done();
    }, done.fail);
  });

  it('conversationSnoozed$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.ConversationSnoozed(roomId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.conversationSnoozed$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      done();
    }, done.fail);
  });

  it('conversationStatusChanged$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const status = externalEvents.ConversationStatus.Solved;
    const event = new externalEvents.ConversationStatusChanged(roomId, status, adviserId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.conversationStatusChanged$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      expect(ev.status).toBe(status);
      expect(ev.adviserId).toBe(adviserId);
      done();
    }, done.fail);
  });

  it('conversationUnsnoozed$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.ConversationUnsnoozed(roomId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.conversationUnsnoozed$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      done();
    }, done.fail);
  });

  it('followerAdded$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.FollowerAdded(adviserId, roomId, requesterId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.followerAdded$.subscribe(ev => {
      expect(ev.adviserId).toBe(adviserId);
      expect(ev.roomId).toBe(roomId);
      expect(ev.requesterId).toBe(requesterId);
      done();
    }, done.fail);
  });

  it('followerRemoved$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.FollowerRemoved(adviserId, roomId, requesterId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.followerRemoved$.subscribe(ev => {
      expect(ev.adviserId).toBe(adviserId);
      expect(ev.roomId).toBe(roomId);
      expect(ev.requesterId).toBe(requesterId);
      done();
    }, done.fail);
  });

  it('allFollowersRemoved$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.AllFollowersRemoved(roomId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.allFollowersRemoved$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      done();
    }, done.fail);
  });

  it('guestProfileUpdated$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.GuestProfileUpdated(
      backOfficeData, customerId, locale, timestamp, roomId, zoneId, tags
    );

    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.guestProfileUpdated$.subscribe(ev => {
      expect(ev.backOfficeData).toBe(backOfficeData);
      expect(ev.customerId).toBe(customerId);
      expect(ev.roomId).toBe(roomId);
      expect(ev.locale).toBe(locale);
      expect(ev.zoneId).toBe(zoneId);
      expect(ev.timestamp).toBe(timestamp);
      expect(ev.tags).toBe(tags);
      done();
    }, done.fail);
  });

  it('lastAdviserTimestampSet$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.LastAdviserTimestampSet(roomId, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.lastAdviserTimestampSet$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      expect(ev.timestamp).toBe(timestamp);
      done();
    }, done.fail);
  });

  it('lastAdviserTimestampRemoved$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.LastAdviserTimestampRemoved(roomId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.lastAdviserTimestampRemoved$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      done();
    }, done.fail);
  });

  it('meetingCancelled$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.MeetingCancelled(adviserId, duration, meetingId, roomId, start);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.meetingCancelled$.subscribe(ev => {
      expect(ev.adviserId).toBe(adviserId);
      expect(ev.duration).toBe(duration);
      expect(ev.meetingId).toBe(meetingId);
      expect(ev.roomId).toBe(roomId);
      expect(ev.start).toBe(start);
      done();
    }, done.fail);
  });

  it('meetingRescheduled$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.MeetingRescheduled(adviserId, duration, meetingId, roomId, start);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.meetingRescheduled$.subscribe(ev => {
      expect(ev.adviserId).toBe(adviserId);
      expect(ev.duration).toBe(duration);
      expect(ev.meetingId).toBe(meetingId);
      expect(ev.roomId).toBe(roomId);
      expect(ev.start).toBe(start);
      done();
    }, done.fail);
  });

  it('meetingScheduled$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.MeetingScheduled(adviserId, duration, meetingId, roomId, start);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.meetingScheduled$.subscribe(ev => {
      expect(ev.adviserId).toBe(adviserId);
      expect(ev.duration).toBe(duration);
      expect(ev.meetingId).toBe(meetingId);
      expect(ev.roomId).toBe(roomId);
      expect(ev.start).toBe(start);
      done();
    }, done.fail);
  });

  it('notificationUpcomingMeeting$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.NotificationUpcomingMeeting(upcomingMeeting);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.notificationUpcomingMeeting$.subscribe(ev => {
      expect(ev.notification).toBe(upcomingMeeting);
      done();
    }, done.fail);
  });

  it('presenceUpdated$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const reason = 'on demand';
    const presence = externalEvents.Presence.Available;
    const event = new externalEvents.PresenceUpdated(presence, timestamp, userId, reason);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.presenceUpdated$.subscribe(ev => {
      expect(ev.presence).toBe(presence);
      expect(ev.timestamp).toBe(timestamp);
      expect(ev.userId).toBe(userId);
      expect(ev.reason).toBe(reason);
      done();
    }, done.fail);
  });

  it('typingSent$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new externalEvents.TypingSent(roomId, timestamp, userId);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.typingSent$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      expect(ev.timestamp).toBe(timestamp);
      expect(ev.userId).toBe(userId);
      done();
    }, done.fail);
  });

  it('unreadCountUpdated$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const unreadCount = 9;
    const event = new externalEvents.UnreadCountUpdated(roomId, unreadCount);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.unreadCountUpdated$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      expect(ev.unreadCount).toBe(unreadCount);
      done();
    }, done.fail);
  });

  it('unreadTotalUpdated$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const unreadCount = 9;
    const tab = externalEvents.ConversationTab.Yours;
    const event = new externalEvents.UnreadTotalUpdated(tab, unreadCount);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.unreadTotalUpdated$.subscribe(ev => {
      expect(ev.tab).toBe(tab);
      expect(ev.unreadCount).toBe(unreadCount);
      done();
    }, done.fail);
  });

  it('unassignedCountUpdated$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const unassignedCount = 7
    const event = new externalEvents.UnassignedCountUpdated(unassignedCount);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.unassignedCountUpdated$.subscribe(ev => {
      expect(ev.count).toBe(unassignedCount);
      done();
    }, done.fail);
  });

  it('customMessage$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const message = 'custom';
    const subtag = 'CUSTOM_TAG';
    const context = { custom: 'custom' }
    const event = new roomEvents.CustomMessageSent(roomId, authorId, message, messageId, subtag, context, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.customMessage$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      expect(ev.message).toBe(message);
      expect(ev.subtag).toBe(subtag);
      expect(ev.context).toBe(context);
      done();
    }, done.fail);
  });

  it('roomCreated$', done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const event = new roomEvents.Created(roomId, authorId, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    client.roomCreated$.subscribe(ev => {
      expect(ev.roomId).toBe(roomId);
      expect(ev.authorId).toBe(authorId);
      expect(ev.timestamp).toBe(timestamp);
      done();
    }, done.fail);
  });

  it('getCall', async () => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'getCall').and.returnValue(Promise.resolve(groupCallEvent));
    const call = await client.getCall(callId);
    expect(call.id).toBe(groupCallEvent.id);
    expect(call.created).toBe(groupCallEvent.created);
  });

  it('getCalls', async () => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'getCalls').and.returnValue(Promise.resolve([groupCallEvent]));
    const calls = await client.getCalls();
    expect(calls[0]).toBeDefined();
  });

  it('createRoom', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'createRoom').and.returnValue(Promise.resolve(groupRoomEvent));
    try {
      const room = await client.createRoom(groupRoomEvent.name);
      expect(room.id).toBe(groupRoomEvent.id);
      expect(room.name).toBe(groupRoomEvent.name);
      expect(room.roomType).toBe(RoomType.GROUP);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('createDirectRoom', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'createDirectRoom').and.returnValue(Promise.resolve(directRoomEvent));
    try {
      const room = await client.createDirectRoom(peerId);
      expect(room.id).toBe(directRoomEvent.id);
      expect(room.name).toBe(directRoomEvent.name);
      expect(room.roomType).toBe(RoomType.DIRECT);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('getRoom', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'getRoom').and.returnValue(Promise.resolve(businessRoomEvent));
    try {
      const room = await client.getRoom(businessRoomEvent.id);
      expect(room.id).toBe(directRoomEvent.id);
      expect(room.name).toBe(directRoomEvent.name);
      expect(room.roomType).toBe(RoomType.BUSINESS);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('createCall', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'createCall').and.returnValue(Promise.resolve(groupCallEvent));
    const metadata = 'metadata';
    try {
      const room = await client.createCall([], groupCallEvent.users, metadata);
      expect(room.users).toBe(groupCallEvent.users);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('getRooms', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const roomsEvents: ReadonlyArray<wireEntities.Room> = [businessRoomEvent, directRoomEvent];
    spyOn(api, 'getRooms').and.returnValue(Promise.resolve(roomsEvents));
    try {
      const rooms = await client.getRooms();
      expect(rooms.length).toBe(roomsEvents.length);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('getRoster', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    const roomsEvents: ReadonlyArray<wireEntities.Room> = [businessRoomEvent, directRoomEvent];
    spyOn(api, 'getRoster').and.returnValue(Promise.resolve(roomsEvents));
    try {
      const rooms = await client.getRoster();
      expect(rooms.length).toBe(roomsEvents.length);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('registerForPushNotifications', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'registerForPushNotifications').and.returnValue(Promise.resolve());
    try {
      await client.registerForPushNotifications(pushId);
      expect(api.registerForPushNotifications).toHaveBeenCalled();
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('unregisterFromPushNotifications', async done => {
    const api = getArtichokeApiMock();
    const client = getArtichoke(api);
    spyOn(api, 'unregisterFromPushNotifications').and.returnValue(Promise.resolve());
    try {
      await client.unregisterFromPushNotifications(pushId);
      expect(api.unregisterFromPushNotifications).toHaveBeenCalled();
      done();
    } catch (e) {
      done.fail(e);
    }
  });
});
