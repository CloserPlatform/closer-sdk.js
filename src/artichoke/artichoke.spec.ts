import { Artichoke } from './artichoke';
import { EventHandler } from '../events/events';
import { apiKeyMock, config, deviceIdMock, log, sessionIdMock } from '../test-utils';
import { callEvents } from '../protocol/events/call-events';
import { decoder } from '../protocol/events/domain-event';
import { errorEvents } from '../protocol/events/error-events';
import { internalEvents } from '../protocol/events/internal-events';
import { roomEvents } from '../protocol/events/room-events';
import { serverEvents } from '../protocol/events/server-events';
import { ArtichokeAPI } from '../apis/artichoke-api';

const roomId = '234';
const callId = '123';
const alice = '321';

class APIMock extends ArtichokeAPI {
  cb;

  constructor() {
    super(sessionIdMock, apiKeyMock, config.chat, log);
  }

  onEvent(callback) {
    this.cb = callback;
  }

  connect() {
    // Do nothing.
  }

  disconnect() {
    // Do nothing.
  }
}

describe('Artichoke', () => {
  let events: EventHandler;
  let api;
  let chat: Artichoke;

  beforeEach(() => {
    events = new EventHandler(log, decoder);
    api = new APIMock();
    chat = new Artichoke(config.chat, log, events, api);
  });

  it('should notify on a new event', (done) => {
    events.onEvent(serverEvents.Hello.tag, (msg: serverEvents.Hello) => done());
    chat.connect();
    api.cb(new serverEvents.Hello(deviceIdMock, Date.now(), 200));
  });

  it('should call a callback on server connection', (done) => {
    chat.onConnect((msg) => done());
    chat.connect();
    api.cb(new serverEvents.Hello(deviceIdMock, Date.now(), 200));
  });

  it('should call a callback on server heartbeat', (done) => {
    chat.onHeartbeat((hb) => done());
    chat.connect();
    api.cb(new serverEvents.OutputHeartbeat(Date.now()));
  });

  it('should invoke \'onServerUnreachable\' if no heartbeat received within double time given in hello', (done) => {
    jasmine.clock().install();

    const heartbeatTimeout = 20;

    chat.onServerUnreachable(() => done());
    chat.connect();
    api.cb(new serverEvents.Hello(deviceIdMock, Date.now(), heartbeatTimeout));

    jasmine.clock().tick(2 * heartbeatTimeout + 1);
    jasmine.clock().uninstall();
  });

  it('should not invoke \'onServerUnreachable\' if heartbeat is received within time given in hello ', (done) => {
    jasmine.clock().install();

    const heartbeatTimeout = 20;
    chat.onServerUnreachable(() => done.fail());
    chat.connect();

    api.cb(new serverEvents.Hello(deviceIdMock, Date.now(), heartbeatTimeout));

    const interval = setInterval(() => {
      api.cb(new serverEvents.OutputHeartbeat(Date.now()));
    }, heartbeatTimeout);

    jasmine.clock().tick(10 * heartbeatTimeout);
    clearInterval(interval);
    done();

    jasmine.clock().uninstall();
  });

  it('should not invoke \'onServerUnreachable\' if \'disconnect()\' was called', (done) => {
    jasmine.clock().install();

    const heartbeatTimeout = 20;

    chat.onServerUnreachable(() => done.fail());
    chat.connect();
    api.cb(new serverEvents.Hello(deviceIdMock, Date.now(), heartbeatTimeout));

    chat.disconnect();
    jasmine.clock().tick(2 * heartbeatTimeout + 1);
    done();

    jasmine.clock().uninstall();
  });

  it('should call a callback on server disconnection', (done) => {
    chat.onDisconnect((msg) => done());
    chat.connect();
    api.cb(new internalEvents.WebsocketDisconnected(1023, 'Too much effort.'));
  });

  it('should call a callback on server error', (done) => {
    chat.onError((error) => done());
    chat.connect();
    api.cb(new errorEvents.Error('why not?'));
  });

  it('should run a callback when a room is created', (done) => {
    events.onEvent(errorEvents.Error.tag, (error) => done.fail());

    chat.onRoomCreated((e) => {
      expect(e.roomId).toBe(roomId);
      done();
    });

    events.notify(new roomEvents.Created(roomId, alice, Date.now()));
  });

  it('should run a callback when a call is created', (done) => {
    events.onEvent(errorEvents.Error.tag, (error) => done.fail());

    chat.onCallCreated((c) => {
      expect(c.callId).toBe(callId);
      done();
    });

    events.notify(new callEvents.Created(callId, alice, Date.now()));
  });
});
