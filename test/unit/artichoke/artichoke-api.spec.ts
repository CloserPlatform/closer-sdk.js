// tslint:disable:max-file-line-count
import { getWebsocketClient } from '../http/websocket-client.spec';
import { getHttpClientMock } from '../../mocks/http-client.mock';
import { CallReason, serverEvents } from '../../../src';
import { serverCommands } from '../../../src/protocol/commands/server-command';
import { WebsocketClient } from '../../../src/http/websocket-client';
import { candidateInitMock } from '../rtc/rtc-peer-connection-facade.spec';
import { rtcCommands } from '../../../src/protocol/commands/rtc-commands';
import {
  createCall,
  createDirectCall,
  createDirectRoom,
  createRoom, HistoryFilter,
  invite,
  leaveReason
} from '../../../src/protocol/protocol';
import { roomCommand } from '../../../src/protocol/commands/room-commands';
import { of, Subject } from 'rxjs';
import { WebSocketSubject } from 'rxjs/webSocket';
import { ArtichokeApi } from '../../../src/artichoke/artichoke-api';
import { ArtichokeMessage } from '../../../src/protocol/artichoke-message';
import { callCommand } from '../../../src/protocol/commands/call-commands';

const callId = 'callId';
const sessionId = 'sessionId';
const pushId = 'pushId';
const roomId = 'roomId';

const getArtichokeApi = (wsClient?: WebsocketClient, httpClient = getHttpClientMock()): ArtichokeApi =>
  new ArtichokeApi(
    '1',
    wsClient || getWebsocketClient(),
    httpClient,
  );

describe('Unit: ArtichokeApi', () => {
  describe('connection$', () => {
    it('use ws connection$', () => {
      const wsClient = getWebsocketClient();
      const spy = spyOnProperty(wsClient, 'connection$', 'get').and.returnValue(of());
      getArtichokeApi(wsClient).connection$.subscribe();
      expect(spy).toHaveBeenCalled();
    });

    it('hello should set deviceId in httpClient', done => {
      const wsClient = getWebsocketClient();
      const httpClient = getHttpClientMock();
      const deviceId = 'deviceId';
      const helloEvent = new serverEvents.Hello(deviceId, 1, 1);
      spyOnProperty(wsClient, 'connection$', 'get').and.returnValue(of(helloEvent));
      spyOn(httpClient, 'setDeviceId');
      const machokeApi = getArtichokeApi(wsClient, httpClient);
      machokeApi.connection$.subscribe(() => {
        expect(httpClient.setDeviceId).toHaveBeenCalledWith(deviceId);
        done();
      }, done.fail);
    });

    it('not set deviceId for event other than hello', done => {
      const wsClient = getWebsocketClient();
      const httpClient = getHttpClientMock();
      const hbEvent = new serverEvents.OutputHeartbeat(Date.now());
      spyOnProperty(wsClient, 'connection$', 'get').and.returnValue(of(hbEvent));
      spyOn(httpClient, 'setDeviceId');
      const machokeApi = getArtichokeApi(wsClient, httpClient);
      machokeApi.connection$.subscribe(() => {
        expect(httpClient.setDeviceId).not.toHaveBeenCalled();
        done();
      }, done.fail);
    });

    it('pass event to domainEvent$', done => {
      const wsClient = getWebsocketClient();
      const deviceId = 'deviceId';
      const helloEvent = new serverEvents.Hello(deviceId, 1, 1);
      spyOnProperty(wsClient, 'connection$', 'get').and.returnValue(of(helloEvent));
      const machokeApi = getArtichokeApi(wsClient);
      machokeApi.domainEvent$.subscribe(ev => {
        expect(ev).toBe(helloEvent);
        done();
      }, done.fail);
      machokeApi.connection$.subscribe();
    });

    it('pass event to domainEvent$ only once after 3 subscriptions', done => {
      const socket$ = new Subject() as WebSocketSubject<ArtichokeMessage>;
      const wsClient = getWebsocketClient(socket$);
      const deviceId = 'deviceId';
      const helloEvent = new serverEvents.Hello(deviceId, 1, 1);
      const machokeApi = getArtichokeApi(wsClient);

      machokeApi.connection$.subscribe();
      machokeApi.connection$.subscribe();
      machokeApi.connection$.subscribe();

      // tslint:disable-next-line:no-let
      let eventsCount = 0;
      machokeApi.domainEvent$.subscribe(ev => {
        expect(ev).toBe(helloEvent);
        eventsCount++;
        expect(eventsCount).toBe(1);
        done();
      }, done.fail);
      socket$.next(helloEvent);
    });

    it('do nothing if not subscribed', done => {
      const wsClient = getWebsocketClient();
      const httpClient = getHttpClientMock();
      const deviceId = 'deviceId';
      const helloEvent = new serverEvents.Hello(deviceId, 1, 1);
      spyOnProperty(wsClient, 'connection$', 'get').and.returnValue(of(helloEvent));
      spyOn(httpClient, 'setDeviceId');
      const machokeApi = getArtichokeApi(wsClient, httpClient);
      machokeApi.domainEvent$.subscribe(() => done.fail());
      expect(httpClient.setDeviceId).not.toHaveBeenCalledWith(deviceId);
      done();
    });
  });

  it('send server heartbeat', () => {
    const wsClient = getWebsocketClient();
    spyOn(wsClient, 'send');
    const timestamp = 1;
    getArtichokeApi(wsClient).sendHeartbeat(timestamp);
    expect(wsClient.send).toHaveBeenCalledWith(new serverCommands.InputHeartbeat(timestamp));
  });

  it('send set audio toggle', () => {
    const wsClient = getWebsocketClient();
    spyOn(wsClient, 'send');
    const enabled = true;
    const timestamp = 1;
    getArtichokeApi(wsClient).setAudioToggle(callId, enabled, timestamp);
    expect(wsClient.send).toHaveBeenCalledWith(new callCommand.AudioStreamToggle(callId, enabled, timestamp));
  });

  it('send set video toggle', () => {
    const wsClient = getWebsocketClient();
    spyOn(wsClient, 'send');
    const enabled = true;
    const timestamp = 1;
    getArtichokeApi(wsClient).setVideoToggle(callId, enabled, timestamp);
    expect(wsClient.send).toHaveBeenCalledWith(new callCommand.VideoStreamToggle(callId, enabled, timestamp));
  });

  describe('Push notifications', () => {
    it('register', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      getArtichokeApi(undefined, httpClient).registerForPushNotifications(pushId);
      expect(httpClient.post).toHaveBeenCalledWith('push/register', {pushId});
    });

    it('unregister', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'delete');
      getArtichokeApi(undefined, httpClient).unregisterFromPushNotifications(pushId);
      expect(httpClient.delete).toHaveBeenCalledWith(`push/unregister/${pushId}`);
    });
  });

  describe('RTC', () => {
    it('sdp', () => {
      const wsClient = getWebsocketClient();
      spyOn(wsClient, 'send');
      const sdpInit: RTCSessionDescriptionInit = {
        sdp: 'sdp',
        type: 'offer',
      };
      getArtichokeApi(wsClient).sendDescription(callId, sessionId, sdpInit);
      expect(wsClient.send).toHaveBeenCalledWith(new rtcCommands.SendDescription(callId, sessionId, sdpInit));
    });

    it('candidate', () => {
      const wsClient = getWebsocketClient();
      spyOn(wsClient, 'send');
      const candidate = candidateInitMock as any;
      getArtichokeApi(wsClient).sendCandidate(callId, sessionId, candidate);
      expect(wsClient.send).toHaveBeenCalledWith(new rtcCommands.SendCandidate(callId, sessionId, candidate));
    });
  });

  describe('Call', () => {
    it('createCall', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      const users: ReadonlyArray<typeof sessionId> = [sessionId];
      getArtichokeApi(undefined, httpClient).createCall(users);
      expect(httpClient.post).toHaveBeenCalledWith(`calls`, createCall(users));
    });

    it('createDirectCall', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      getArtichokeApi(undefined, httpClient).createDirectCall(sessionId);
      expect(httpClient.post).toHaveBeenCalledWith(`calls`, createDirectCall(sessionId));
    });

    it('createDirectCall with timeout', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      const timeout = 123;
      getArtichokeApi(undefined, httpClient).createDirectCall(sessionId, timeout);
      expect(httpClient.post).toHaveBeenCalledWith(`calls`, createDirectCall(sessionId, timeout));
    });

    it('createDirectCall with timeout and metadata', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      const timeout = 123;
      const metadata = {test: 'test'};
      getArtichokeApi(undefined, httpClient).createDirectCall(sessionId, timeout, metadata);
      expect(httpClient.post).toHaveBeenCalledWith(`calls`, createDirectCall(sessionId, timeout, metadata));
    });

    it('getCall', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'get');
      getArtichokeApi(undefined, httpClient).getCall(callId);
      expect(httpClient.get).toHaveBeenCalledWith(`calls/${callId}`);
    });

    it('getCalls', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'get');
      getArtichokeApi(undefined, httpClient).getCalls();
      expect(httpClient.get).toHaveBeenCalledWith(`calls`);
    });

    it('getActiveCalls', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'get');
      getArtichokeApi(undefined, httpClient).getActiveCalls();
      expect(httpClient.get).toHaveBeenCalledWith(`calls/active`);
    });

    it('getCallsWithPendingInvitations', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'get');
      getArtichokeApi(undefined, httpClient).getCallsWithPendingInvitations();
      expect(httpClient.get).toHaveBeenCalledWith(`calls/pending-invitation`);
    });

    it('getCallHistory', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'get');
      getArtichokeApi(undefined, httpClient).getCallHistory(callId);
      expect(httpClient.get).toHaveBeenCalledWith(`calls/${callId}/history`);
    });

    it('getCallUsers', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'get');
      getArtichokeApi(undefined, httpClient).getCallUsers(callId);
      expect(httpClient.get).toHaveBeenCalledWith(`calls/${callId}/users`);
    });

    it('answerCall', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      getArtichokeApi(undefined, httpClient).answerCall(callId);
      expect(httpClient.post).toHaveBeenCalledWith(`calls/${callId}/answer`);
    });

    it('rejectCall', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      const reason = CallReason.Busy;
      getArtichokeApi(undefined, httpClient).rejectCall(callId, reason);
      expect(httpClient.post).toHaveBeenCalledWith(`calls/${callId}/reject`, leaveReason(reason));
    });

    it('joinCall', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      getArtichokeApi(undefined, httpClient).joinCall(callId);
      expect(httpClient.post).toHaveBeenCalledWith(`calls/${callId}/join`);
    });

    it('pullCall', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      getArtichokeApi(undefined, httpClient).pullCall(callId);
      expect(httpClient.post).toHaveBeenCalledWith(`calls/${callId}/pull`);
    });

    it('leaveCall', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      const reason = CallReason.Disconnected;
      getArtichokeApi(undefined, httpClient).leaveCall(callId, reason);
      expect(httpClient.post).toHaveBeenCalledWith(`calls/${callId}/leave`, leaveReason(reason));
    });

    it('inviteToCall', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      getArtichokeApi(undefined, httpClient).inviteToCall(callId, sessionId);
      expect(httpClient.post).toHaveBeenCalledWith(`calls/${callId}/invite/${sessionId}`);
    });
  });

  describe('Room', () => {
    it('createRoom', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      const name = 'name';
      getArtichokeApi(undefined, httpClient).createRoom(name);
      expect(httpClient.post).toHaveBeenCalledWith(`rooms`, createRoom(name));
    });

    it('createDirectRoom', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      getArtichokeApi(undefined, httpClient).createDirectRoom(sessionId);
      expect(httpClient.post).toHaveBeenCalledWith(`rooms`, createDirectRoom(sessionId));
    });

    it('createDirectRoom with context', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      const context = {test: 'test'};
      getArtichokeApi(undefined, httpClient).createDirectRoom(sessionId, context);
      expect(httpClient.post).toHaveBeenCalledWith(`rooms`, createDirectRoom(sessionId, context));
    });

    it('getRoom', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'get');
      getArtichokeApi(undefined, httpClient).getRoom(roomId);
      expect(httpClient.get).toHaveBeenCalledWith(`rooms/${roomId}`);
    });

    it('getRooms', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'get');
      getArtichokeApi(undefined, httpClient).getRooms();
      expect(httpClient.get).toHaveBeenCalledWith(`rooms`);
    });

    it('getRoster', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'get');
      getArtichokeApi(undefined, httpClient).getRoster();
      expect(httpClient.get).toHaveBeenCalledWith(`rooms/roster`);
    });

    it('getRoomUsers', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'get');
      getArtichokeApi(undefined, httpClient).getRoomUsers(roomId);
      expect(httpClient.get).toHaveBeenCalledWith(`rooms/${roomId}/users`);
    });

    it('getRoomHistoryLast', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'getPaginated');
      const count = 10;
      getArtichokeApi(undefined, httpClient).getRoomHistoryLast(roomId, count);
      expect(httpClient.getPaginated).toHaveBeenCalledWith(`rooms/${roomId}/history/last?count=${count}`);
    });

    it('getRoomHistoryLast with filters', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'getPaginated');
      const count = 10;
      const filter: HistoryFilter = {
        filter: ['x', 'y'],
        customFilter: ['a', 'b']
      };
      getArtichokeApi(undefined, httpClient).getRoomHistoryLast(roomId, count, filter);
      expect(httpClient.getPaginated).toHaveBeenCalledWith(
        `rooms/${roomId}/history/last?count=${count}&filter=x&filter=y&customFilter=a&customFilter=b`);
    });

    it('getRoomHistoryPage', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'getPaginated');
      const offset = 10;
      const limit = 20;
      getArtichokeApi(undefined, httpClient).getRoomHistoryPage(roomId, offset, limit);
      expect(httpClient.getPaginated).toHaveBeenCalledWith(
        `rooms/${roomId}/history/page?offset=${offset}&limit=${limit}`);
    });

    it('getRoomHistoryPage with filters', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'getPaginated');
      const offset = 10;
      const limit = 20;
      const filter: HistoryFilter = {
        filter: ['x', 'y'],
        customFilter: ['a', 'b']
      };
      getArtichokeApi(undefined, httpClient).getRoomHistoryPage(roomId, offset, limit, filter);
      expect(httpClient.getPaginated).toHaveBeenCalledWith(
        `rooms/${roomId}/history/page?offset=${offset}&limit=${limit}&filter=x&filter=y&customFilter=a&customFilter=b`);
    });

    it('joinRoom', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      getArtichokeApi(undefined, httpClient).joinRoom(roomId);
      expect(httpClient.post).toHaveBeenCalledWith(`rooms/${roomId}/join`);
    });

    it('leaveRoom', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      getArtichokeApi(undefined, httpClient).leaveRoom(roomId);
      expect(httpClient.post).toHaveBeenCalledWith(`rooms/${roomId}/leave`);
    });

    it('inviteToRoom', () => {
      const httpClient = getHttpClientMock();
      spyOn(httpClient, 'post');
      getArtichokeApi(undefined, httpClient).inviteToRoom(roomId, sessionId);
      expect(httpClient.post).toHaveBeenCalledWith(`rooms/${roomId}/invite`, invite(sessionId));
    });

    it('sendMessage', () => {
      const wsClient = getWebsocketClient();
      spyOn(wsClient, 'ask');
      const body = 'body';
      getArtichokeApi(wsClient).sendMessage(roomId, body);
      expect(wsClient.ask).toHaveBeenCalledWith(new roomCommand.SendMessage(roomId, body, {}));
    });

    it('sendMessage with context', () => {
      const wsClient = getWebsocketClient();
      spyOn(wsClient, 'ask');
      const body = 'body';
      const context = {test: 'test'};
      getArtichokeApi(wsClient).sendMessage(roomId, body, context);
      expect(wsClient.ask).toHaveBeenCalledWith(new roomCommand.SendMessage(roomId, body, context));
    });

    it('sendCustom', () => {
      const wsClient = getWebsocketClient();
      spyOn(wsClient, 'ask');
      const body = 'body';
      const subtag = 'subtag';
      const context = {};
      getArtichokeApi(wsClient).sendCustom(roomId, body, subtag, context);
      expect(wsClient.ask).toHaveBeenCalledWith(new roomCommand.SendCustomMessage(roomId, body, subtag, context));
    });

    it('sendTyping', () => {
      const wsClient = getWebsocketClient();
      spyOn(wsClient, 'send');
      getArtichokeApi(wsClient).sendTyping(roomId);
      expect(wsClient.send).toHaveBeenCalledWith(new roomCommand.SendTyping(roomId));
    });

    it('setMark', () => {
      const wsClient = getWebsocketClient();
      spyOn(wsClient, 'send');
      const timestamp = 123;
      getArtichokeApi(wsClient).setMark(roomId, timestamp);
      expect(wsClient.send).toHaveBeenCalledWith(new roomCommand.SendMark(roomId, timestamp));
    });

    it('setDelivered', () => {
      const wsClient = getWebsocketClient();
      spyOn(wsClient, 'send');
      const msgId = 'msgId';
      const timestamp = 123;
      getArtichokeApi(wsClient).setDelivered(roomId, msgId, timestamp);
      expect(wsClient.send).toHaveBeenCalledWith(new roomCommand.ConfirmMessageDelivery(roomId, msgId, timestamp));
    });
  });
});
