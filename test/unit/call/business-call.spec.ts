// tslint:disable:max-file-line-count
import { BusinessCall, callEvents, CallReason } from '../../../src';
import * as wireEntities from '../../../src/protocol/wire-entities';
import { getArtichokeApiMock } from '../../mocks/artichoke-api.mock';
import { getLoggerServiceMock } from '../../mocks/logger.mock';
import { getMediaTrackOptimizerMock } from '../rtc/media-track-optimizer.spec';
import { getMediaStreamTrackMock } from '../../mocks/media-stream-track.mock';
import { ID } from '../../../src/protocol/protocol';
import Answered = callEvents.Answered;
import EndReason = callEvents.EndReason;
import { of } from 'rxjs';
import { getRTCPool } from '../../mocks/rtc-pool';

const authorId = 'authorId';
const deviceId = 'deviceId';
const timestamp = 123;
const businessCallEvent: wireEntities.Call = {
  id: 'id', created: 1, creator: 'creator', direct: false, users: [], invitees: [], orgId: 'orgId'
};

const mediaTrackOptimizer = getMediaTrackOptimizerMock();

const getCall = (
  rtcPool = getRTCPool(),
  artichokeApi = getArtichokeApiMock(),
  call = businessCallEvent,
  tracks: ReadonlyArray<MediaStreamTrack> = [],
  logger = getLoggerServiceMock(),
): BusinessCall =>
  new BusinessCall(
    call,
    logger,
    mediaTrackOptimizer,
    artichokeApi,
    rtcPool,
    tracks,
  );

describe('Unit: BusinessCall', () => {
  it('remoteTrack$', () => {
    const pool = getRTCPool();
    const call = getCall(pool);
    const spy = spyOnProperty(pool, 'remoteTrack$', 'get').and.callThrough();
    call.remoteTrack$.subscribe();
    expect(spy).toHaveBeenCalled();
  });

  it('replaceTrackByKind', () => {
    const pool = getRTCPool();
    const call = getCall(pool);
    spyOn(mediaTrackOptimizer, 'addContentHint');
    spyOn(pool, 'replaceTrackByKind');

    const track = getMediaStreamTrackMock('video');
    call.replaceTrackByKind(track);

    expect(mediaTrackOptimizer.addContentHint).toHaveBeenCalledWith(track);
    expect(pool.replaceTrackByKind).toHaveBeenCalledWith(track);
  });

  it('broadcast', () => {
    const pool = getRTCPool();
    const call = getCall(pool);
    spyOn(pool, 'broadcast');
    const message = 'test';
    call.broadcast(message);
    expect(pool.broadcast).toHaveBeenCalledWith(message);
  });

  it('message$', () => {
    const pool = getRTCPool();
    const call = getCall(pool);
    const spy = spyOnProperty(pool, 'message$', 'get').and.callThrough();
    call.message$.subscribe();
    expect(spy).toHaveBeenCalled();
  });

  it('peerState$', () => {
    const pool = getRTCPool();
    const call = getCall(pool);
    const spy = spyOnProperty(pool, 'peerStatus$', 'get').and.callThrough();
    call.peerStatus$.subscribe();
    expect(spy).toHaveBeenCalled();
  });

  it('getUsers', async done => {
    const api = getArtichokeApiMock();
    const pool = getRTCPool();
    const call = getCall(pool, api);
    const usersIds: ReadonlyArray<ID> = ['x'];
    spyOn(api, 'getCallUsers').and.returnValue(Promise.resolve(usersIds));
    try {
      const users = await call.getUsers();
      expect(users).toBe(usersIds);
      expect(api.getCallUsers).toHaveBeenCalledWith(businessCallEvent.id);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('getMessages', async done => {
    const api = getArtichokeApiMock();
    const pool = getRTCPool();
    const call = getCall(pool, api);
    const testCallEvents: ReadonlyArray<callEvents.CallEvent> = [
      new Answered(businessCallEvent.id, businessCallEvent.creator, 1)
    ];
    spyOn(api, 'getCallHistory').and.returnValue(Promise.resolve(testCallEvents));
    try {
      const messages = await call.getMessages();
      expect(messages).toBe(testCallEvents);
      expect(api.getCallHistory).toHaveBeenCalledWith(businessCallEvent.id);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('answer', async done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const baseTrack = getMediaStreamTrackMock('video');
    const call = getCall(pool, api, businessCallEvent, [baseTrack]);
    spyOn(pool, 'addTrack');
    spyOn(mediaTrackOptimizer, 'addContentHint');
    spyOn(api, 'answerCall').and.returnValue(Promise.resolve());

    const tracks: ReadonlyArray<MediaStreamTrack> = [
      getMediaStreamTrackMock('audio'),
      getMediaStreamTrackMock('video'),
    ];

    try {
      await call.answer(tracks);
      tracks.forEach(track => expect(pool.addTrack).toHaveBeenCalledWith(track));
      tracks.forEach(track => expect(mediaTrackOptimizer.addContentHint).toHaveBeenCalledWith(track));
      expect(api.answerCall).toHaveBeenCalledWith(businessCallEvent.id);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('reject', async done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const call = getCall(pool, api);
    spyOn(api, 'rejectCall').and.returnValue(Promise.resolve());
    const reason = CallReason.Busy;
    try {
      await call.reject(reason);
      expect(api.rejectCall).toHaveBeenCalledWith(businessCallEvent.id, reason);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('leave', async done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const call = getCall(pool, api);
    spyOn(pool, 'destroyAllConnections');
    spyOn(api, 'leaveCall').and.returnValue(Promise.resolve());
    const reason = CallReason.Busy;
    try {
      await call.leave(reason);
      expect(pool.destroyAllConnections).toHaveBeenCalled();
      expect(api.leaveCall).toHaveBeenCalledWith(businessCallEvent.id, reason);
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  it('answered$', done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const event = new callEvents.Answered(businessCallEvent.id, authorId, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const call = getCall(pool, api);
    call.answered$.subscribe(ev => {
      expect(ev).toBe(event);
      done();
    }, done.fail);
  });

  it('rejected$', done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const call = getCall(pool, api);
    const event = new callEvents.Rejected(businessCallEvent.id, authorId, EndReason.Busy, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    call.rejected$.subscribe(ev => {
      expect(ev).toBe(event);
      done();
    }, done.fail);
  });

  it('left$', done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const event = new callEvents.Left(businessCallEvent.id, authorId, EndReason.Disconnected, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const call = getCall(pool, api);
    call.left$.subscribe(ev => {
      expect(ev).toBe(event);
      done();
    }, done.fail);
  });

  it('offline$', done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const call = getCall(pool, api);
    const event = new callEvents.DeviceOffline(businessCallEvent.id, authorId, deviceId, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    call.offline$.subscribe(ev => {
      expect(ev).toBe(event);
      done();
    }, done.fail);
  });

  it('online$', done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const call = getCall(pool, api);
    const event = new callEvents.DeviceOnline(businessCallEvent.id, authorId, deviceId, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    call.online$.subscribe(ev => {
      expect(ev).toBe(event);
      done();
    }, done.fail);
  });

  it('joined$ resolved connect', done => {
    const pool = getRTCPool();
    spyOn(pool, 'connect').and.returnValue(Promise.resolve());
    const api = getArtichokeApiMock();
    const event = new callEvents.Joined(businessCallEvent.id, authorId, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event, event));
    const call = getCall(pool, api);
    call.joined$.subscribe(ev => {
      expect(ev).toBe(event);
      expect(pool.connect).toHaveBeenCalled();
      done();
    }, done.fail);
  });

  it('joined$ rejected connect', done => {
    const pool = getRTCPool();
    spyOn(pool, 'connect').and.returnValue(Promise.reject());
    const api = getArtichokeApiMock();
    const event = new callEvents.Joined(businessCallEvent.id, authorId, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    const call = getCall(pool, api);
    call.joined$.subscribe(ev => {
      expect(ev).toBe(event);
      expect(pool.connect).toHaveBeenCalled();
      done();
    }, done.fail);
  });

  it('activeDevice$', done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const call = getCall(pool, api);
    const event = new callEvents.CallHandledOnDevice(businessCallEvent.id, authorId, deviceId, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    call.activeDevice$.subscribe(ev => {
      expect(ev).toBe(event);
      done();
    }, done.fail);
  });

  it('activeDevice event call pool destroyAllConnections', () => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const event = new callEvents.CallHandledOnDevice(businessCallEvent.id, authorId, deviceId, timestamp);
    spyOn(pool, 'destroyAllConnections');
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    getCall(pool, api);
    expect(pool.destroyAllConnections).toHaveBeenCalled();
  });

  it('end$', done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const call = getCall(pool, api);
    const event = new callEvents.Ended(businessCallEvent.id, EndReason.Ended, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    call.end$.subscribe(ev => {
      expect(ev).toBe(event);
      done();
    }, done.fail);
  });

  it('set ended and call peerconnection disconnect', () => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const event = new callEvents.Ended(businessCallEvent.id, EndReason.Ended, timestamp);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    spyOn(pool, 'destroyAllConnections');
    const call = getCall(pool, api);
    expect(call.ended).toBe(timestamp);
    expect(pool.destroyAllConnections).toHaveBeenCalled();
  });

  it('invited$', done => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const call = getCall(pool, api);
    const event = new callEvents.Invited(businessCallEvent.id, 'authorId', 'invitee', 1);
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
    call.invited$.subscribe(ev => {
      expect(ev).toBe(event);
      done();
    }, done.fail);
  });

  it('invite', () => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const call = getCall(pool, api);
    spyOn(api, 'inviteToCall');
    const userId = 'userId';
    call.invite(userId);
    expect(api.inviteToCall).toHaveBeenCalledWith(businessCallEvent.id, userId);
  });

  it('join', () => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const call = getCall(pool, api);
    spyOn(api, 'joinCall');
    spyOn(pool, 'addTrack');
    const track = getMediaStreamTrackMock('video');
    call.join([track]);
    expect(api.joinCall).toHaveBeenCalledWith(businessCallEvent.id);
    expect(pool.addTrack).toHaveBeenCalledWith(track);
  });

  it('end, left and active device should call disconnect only once', () => {
    const pool = getRTCPool();
    const api = getArtichokeApiMock();
    const activeDevice = new callEvents.CallHandledOnDevice(businessCallEvent.id, authorId, deviceId, timestamp);
    const left = new callEvents.Left(businessCallEvent.id, authorId, EndReason.CallRejected, timestamp);
    const end = new callEvents.Ended(businessCallEvent.id, EndReason.Ended, timestamp);
    spyOn(pool, 'destroyAllConnections');
    spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(activeDevice, left, end));
    getCall(pool, api);
    expect(pool.destroyAllConnections).toHaveBeenCalledTimes(1);
  });
});
