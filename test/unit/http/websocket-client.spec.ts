import { WebsocketClient } from '../../../src/http/websocket-client';
import { DomainCommand } from '../../../src/protocol/commands/domain-command';
import { roomCommand } from '../../../src/protocol/commands/room-commands';
import { chatEvents, errorEvents, serverEvents } from '../../../src';
import Received = chatEvents.Received;
import { Ref } from '../../../src/protocol/protocol';
import { getUUIDGenerator } from './../utils/uuid-generator.spec';
import { getConfigMock } from '../../mocks/config.mock';
import { getSocket$Mock } from '../../mocks/websocket-client.mock';
import { WebSocketSubject } from 'rxjs/webSocket';
import { ArtichokeMessage } from '../../../src/protocol/artichoke-message';
import { fromArray } from 'rxjs/internal/observable/fromArray';
import { Subject } from 'rxjs';

const domainCommand: DomainCommand = {tag: 'test', __discriminator__: 'domainCommand'};
const helloEvent = new serverEvents.Hello('deviceId', 1, 1);
const sendMessage: roomCommand.SendMessage = {
  body: 'test', context: '', roomId: '1', tag: 'test', __discriminator__: 'domainCommand'
};

const getChatEventReceived = (ref?: Ref): chatEvents.Received => ({
  ref,
  message: {id: '1', authorId: '2', channelId: '3', tag: 'test', data: 'test', timestamp: 1},
  eventId: '1',
  tag: Received.tag,
  __discriminator__: 'domainEvent'
});

const getErrorEvent = (ref?: Ref): errorEvents.Error => ({
  ref,
  reason: 'text',
  tag: errorEvents.Error.tag,
  __discriminator__: 'domainEvent'
});

const askTimeout = getConfigMock().artichoke.askTimeoutMs;

const getSocketMessagesMock = (msgs: ReadonlyArray<ArtichokeMessage>): WebSocketSubject<ArtichokeMessage> =>
  fromArray(msgs) as WebSocketSubject<ArtichokeMessage>;

const getSocketAsSubjectMock = (): WebSocketSubject<ArtichokeMessage> =>
  new Subject() as WebSocketSubject<ArtichokeMessage>;

export const getWebsocketClient = (socket$ = getSocket$Mock(), uuidGenerator = getUUIDGenerator()): WebsocketClient =>
  new WebsocketClient(
    socket$,
    uuidGenerator,
    askTimeout,
  );

describe('WebsocketClient', () => {
  describe('connection$', () => {
    it('call connect with proper url', done => {
      const hello = new serverEvents.Hello('deviceId', 1, 1);
      const socket$ = getSocketMessagesMock([hello]);
      const client = getWebsocketClient(socket$);
      client.connection$.subscribe(res => {
        expect(res).toBe(hello);
        done();
      }, done.fail);
    });
  });

  describe('send', () => {
    it('call send', () => {
      const socketMock = getSocketAsSubjectMock();
      spyOn(socketMock, 'next');
      const client = getWebsocketClient(socketMock);
      client.send(domainCommand);
      expect(socketMock.next).toHaveBeenCalledWith(domainCommand);
    });
  });

  describe('ask', () => {
    it('send message successfully', async done => {
      const socketMock = getSocketAsSubjectMock();
      const uuidGenerator = getUUIDGenerator();
      const client = getWebsocketClient(socketMock, uuidGenerator);
      const refId = 'refId';
      spyOn(uuidGenerator, 'next').and.returnValue(refId);
      spyOn(client, 'send').and.callThrough();
      const messageReceived = getChatEventReceived(refId);
      jasmine.clock().install();
      client.ask(sendMessage).subscribe(ev => {
        expect(ev).toBe(messageReceived);
        done();
      }, done.fail);
      socketMock.next(messageReceived);
      jasmine.clock().tick(askTimeout - 1);
      expect(client.send).toHaveBeenCalledWith({...sendMessage, ref: refId} as DomainCommand);
      expect(sendMessage.ref).not.toBeDefined();
      jasmine.clock().uninstall();
    });

    it('fail with timeout if there is no/wrong ref', async done => {
      const socketMock = getSocketAsSubjectMock();
      const uuidGenerator = getUUIDGenerator();
      const client = getWebsocketClient(socketMock, uuidGenerator);
      const refId = 'refId';
      spyOn(uuidGenerator, 'next').and.returnValue(refId);
      spyOn(client, 'send').and.callThrough();
      const messageReceived = getChatEventReceived('');
      jasmine.clock().install();
      client.ask(sendMessage).subscribe(() => done.fail('should fail'), err => {
        expect(err.message).toContain('Timeout');
        done();
      });
      socketMock.next(messageReceived);
      jasmine.clock().tick(askTimeout);
      expect(client.send).toHaveBeenCalledWith({...sendMessage, ref: refId} as DomainCommand);
      expect(sendMessage.ref).not.toBeDefined();
      jasmine.clock().uninstall();
    });

    it('fail with timeout', async done => {
      const socketMock = getSocketAsSubjectMock();
      const client = getWebsocketClient(socketMock);
      spyOn(client, 'send').and.callThrough();
      jasmine.clock().install();
      client.ask(sendMessage).subscribe(() => done.fail('should fail'), err => {
        expect(err.message).toContain('Timeout');
        done();
      });
      jasmine.clock().tick(askTimeout);
      expect(client.send).toHaveBeenCalled();
      jasmine.clock().uninstall();
    });

    it('fail with backend error', async done => {
      const socketMock = getSocketAsSubjectMock();
      const uuidGenerator = getUUIDGenerator();
      const client = getWebsocketClient(socketMock, uuidGenerator);
      const refId = 'refId';
      spyOn(uuidGenerator, 'next').and.returnValue(refId);
      spyOn(client, 'send').and.callThrough();
      const errorEvent = getErrorEvent(refId);
      jasmine.clock().install();
      client.ask(sendMessage).subscribe(
        () => done.fail('should fail'),
        err => {
          expect(err).toBe(errorEvent);
          done();
        });
      socketMock.next(errorEvent);
      jasmine.clock().tick(askTimeout - 1);
      expect(client.send).toHaveBeenCalledWith({...sendMessage, ref: refId} as DomainCommand);
      jasmine.clock().uninstall();
    });

    it('reject if send failed', async done => {
      const socket$ = getSocketAsSubjectMock();
      const client = getWebsocketClient(socket$);
      const errorReason = 'errorReason';
      spyOn(client, 'send').and.throwError(errorReason);
      try {
        await client.ask(sendMessage);
        done.fail('Should fail');
      } catch (e) {
        expect(e.message).toContain(errorReason);
        done();
      }
    });
  });

  describe('connection$', () => {
    it('pass event', done => {
      const socket$ = getSocketMessagesMock([helloEvent]);
      const client = getWebsocketClient(socket$);
      client.connection$.subscribe(ev => {
        expect(ev).toBe(helloEvent);
        done();
      }, done.fail);
    });
  });
});
