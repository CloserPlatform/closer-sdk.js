import { Artichoke } from './artichoke';
import { apiKeyMock, config, deviceIdMock, loggerFactory, sessionIdMock } from '../test-utils';
import { callEvents } from '../protocol/events/call-events';
import { errorEvents } from '../protocol/events/error-events';
import { roomEvents } from '../protocol/events/room-events';
import { serverEvents } from '../protocol/events/server-events';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { RTCPoolRepository } from '../rtc/rtc-pool-repository';

/*  TODO:
 *  Add tests:
 *  - should call a callback on server disconnection
 */

// tslint:disable:no-any
// tslint:disable:no-magic-numbers
// tslint:disable:no-let
const roomId = '234';
const callId = '123';
const alice = '321';

class APIMock extends ArtichokeAPI {
  public cb: any;

  constructor() {
    super(sessionIdMock, config.chat, apiKeyMock, loggerFactory);
  }

  public onEvent(callback: any): void {
    this.cb = callback;
  }

  public connect(): void {
    // Do nothing.
  }

  public disconnect(): void {
    // Do nothing.
  }
}

describe('Artichoke', () => {
  let api: APIMock;
  let chat: Artichoke;
  let rtcPoolRepository: RTCPoolRepository;

  beforeEach(() => {
    api = new APIMock();
    rtcPoolRepository = new RTCPoolRepository(config.chat.rtc, loggerFactory, api);
    chat = new Artichoke(api, loggerFactory, rtcPoolRepository);
  });

  it('should notify on a new event', (done) => {
    chat.connect$.subscribe(_ => done());
    chat.connect();
    api.cb(new serverEvents.Hello(deviceIdMock, Date.now(), 200));
  });

  it('should call a callback on server connection', (done) => {
    chat.connect$.subscribe(_ => done());
    chat.connect();
    api.cb(new serverEvents.Hello(deviceIdMock, Date.now(), 200));
  });

  it('should call a callback on server heartbeat', (done) => {
    chat.heartbeat$.subscribe(_ => done());
    chat.connect();
    api.cb(new serverEvents.OutputHeartbeat(Date.now()));
  });

  it('should invoke \'onServerUnreachable\' if no heartbeat received within double time given in hello', (done) => {
    jasmine.clock().install();

    const heartbeatTimeout = 20;

    chat.serverUnreachable$.subscribe(done);
    chat.connect();
    api.cb(new serverEvents.Hello(deviceIdMock, Date.now(), heartbeatTimeout));

    jasmine.clock().tick(heartbeatTimeout * 2 + 1);
    jasmine.clock().uninstall();
  });

  it('should not invoke \'onServerUnreachable\' if heartbeat is received within time given in hello ', (done) => {
    jasmine.clock().install();

    const heartbeatTimeout = 20;
    chat.serverUnreachable$.subscribe(() => done.fail());
    chat.connect();

    api.cb(new serverEvents.Hello(deviceIdMock, Date.now(), heartbeatTimeout));

    const interval = setInterval(() => {
      api.cb(new serverEvents.OutputHeartbeat(Date.now()));
    }, heartbeatTimeout);

    jasmine.clock().tick(heartbeatTimeout * 10);
    clearInterval(interval);
    done();

    jasmine.clock().uninstall();
  });

  it('should not invoke \'onServerUnreachable\' if \'disconnect()\' was called', (done) => {
    jasmine.clock().install();

    const heartbeatTimeout = 20;

    chat.serverUnreachable$.subscribe(() => done.fail());
    chat.connect();
    api.cb(new serverEvents.Hello(deviceIdMock, Date.now(), heartbeatTimeout));

    chat.disconnect();
    jasmine.clock().tick(heartbeatTimeout * 2 + 1);
    done();

    jasmine.clock().uninstall();
  });

  it('should call a callback on server error', (done) => {
    chat.error$.subscribe((_msg) => done());
    chat.connect();
    api.cb(new errorEvents.Error('why not?'));
  });

  it('should run a callback when a room is created', (done) => {
    chat.error$.subscribe(_ => done.fail());
    chat.roomCreated$.subscribe((e) => {
      expect(e.roomId).toBe(roomId);
      done();
    });

    api.cb(new roomEvents.Created(roomId, alice, Date.now()));
  });

  it('should run a callback when a call is created', (done) => {
    chat.error$.subscribe(_ => done.fail());
    chat.callCreated$.subscribe((c) => {
      expect(c.callId).toBe(callId);
      done();
    });

    api.cb(new callEvents.Created(callId, alice, Date.now()));
  });
});
