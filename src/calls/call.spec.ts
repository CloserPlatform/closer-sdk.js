// tslint:disable:max-file-line-count
// tslint:disable:no-let
import { Call } from './call';
import {
  apiKeyMock, config, deviceIdMock, getStream, isWebRTCSupported, log, loggerFactory, sessionIdMock, whenever
} from '../test-utils';
import { callEvents } from '../protocol/events/call-events';
import { ID } from '../protocol/protocol';
import { Call as ProtoCall } from '../protocol/wire-entities';
import EndReason = callEvents.EndReason;
import { ArtichokeAPI } from '../apis/artichoke-api';
import { CallReason } from '../apis/call-reason';
import { CallType } from './call-type';
import { GroupCall } from './group-call';
import { RTCPool } from '../rtc/rtc-pool';
import CallEvent = callEvents.CallEvent;
import { CallFactory } from './call-factory';
import { RTCPoolRepository } from '../rtc/rtc-pool-repository';

const callId = '123';
const aliceSessionId = '321';
const bob = '456';
const chad = '987';
const david = '654';
const msg1Mock = 2323;
const msg2Mock = 1313;

const msgFn = (ts: number): callEvents.Joined =>
  new callEvents.Joined(callId, aliceSessionId, ts);

class APIMock extends ArtichokeAPI {
  public joined = false;
  public left: string;
  public answered = false;
  public rejected: string;
  public invited: string;
  // tslint:disable-next-line:no-any
  public cb: any;

  constructor(sessionId: string) {
    super(sessionId, apiKeyMock, config.chat, loggerFactory);
  }

  // tslint:disable-next-line:no-any
  public onEvent(callback: any): void {
    this.cb = callback;
  }

  public getCallHistory(_id: string): Promise<ReadonlyArray<CallEvent>> {
    return Promise.resolve([msgFn(msg1Mock), msgFn(msg2Mock)]);
  }

  public getCallUsers(_id: string): Promise<ReadonlyArray<string>> {
    return Promise.resolve([aliceSessionId, bob, chad]);
  }

  public answerCall(_id: string): Promise<void> {
    this.answered = true;

    return Promise.resolve(undefined);
  }

  public rejectCall(_id: string, reason: CallReason): Promise<void> {
    this.rejected = reason;

    return Promise.resolve(undefined);
  }

  public joinCall(_id: string): Promise<void> {
    this.joined = true;

    return Promise.resolve(undefined);
  }

  public leaveCall(_id: string, reason: CallReason): Promise<void> {
    this.left = reason;

    return Promise.resolve(undefined);
  }

  public pullCall(_id: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  public inviteToCall(_id: string, peer: string): Promise<void> {
    this.invited = peer;

    return Promise.resolve(undefined);
  }

  public sendDescription(_id: string, _peer: string, _sdp: RTCSessionDescriptionInit): Promise<void> {
    return Promise.resolve();
  }

  public sendCandidate(_id: string, _peer: string, _candidate: RTCIceCandidate): Promise<void> {
    return Promise.resolve();
  }
}

const makeCall = (callType: CallType): ProtoCall => {
  const call: ProtoCall = {
    id: callId,
    created: 123,
    creator: aliceSessionId,
    users: [aliceSessionId],
    direct: false
  };

  switch (callType) {
    case CallType.DIRECT:
      call.direct = true;

      return call;

    case CallType.GROUP:
      call.direct = false;

      return call;

    default:
      throw Error('invalid CallType');
  }
};

const makeGroupCall = (creator: ID, users: ReadonlyArray<ID>): ProtoCall =>
  ({
    id: callId,
    created: 123,
    creator,
    users,
    direct: false,
  });

['DirectCall', 'GroupCall'].forEach((d) => {
  describe(d, () => {
    let api: APIMock;
    let call: Call;
    let callFactory: CallFactory;

    beforeEach(() => {
      api = new APIMock(sessionIdMock);
      const rtcPoolRepository = new RTCPoolRepository(config.chat.rtc, loggerFactory, api);
      callFactory = new CallFactory(loggerFactory, api, rtcPoolRepository);
      const callType = d === 'DirectCall' ? CallType.DIRECT : CallType.GROUP;
      call = callFactory.create(makeCall(callType));
    });

    it('for creator should create RTC connection with old users in call', (done) => {
      const apiMock = new APIMock(aliceSessionId);
      const rtcPoolRepo = new RTCPoolRepository(config.chat.rtc, loggerFactory, apiMock);
      const callFactory2 = new CallFactory(loggerFactory, apiMock, rtcPoolRepo);
      spyOn(apiMock, 'getCallUsers').and.returnValue(Promise.resolve([aliceSessionId, bob, chad, david]));

      const usersToOffer = new Set([bob, chad, david]);
      const usersNotToOffer = new Set([aliceSessionId]);

      spyOn(RTCPool.prototype, 'connect').and.callFake((u: string) => {
        done();
        if (usersNotToOffer.has(u)) {
          done.fail();
        } else {
          usersToOffer.delete(u);
          if (usersToOffer.size === 0) {
            done();
          }
        }
      });

      // tslint:disable-next-line
      callFactory2.create(makeGroupCall(aliceSessionId, [aliceSessionId, david])) as GroupCall;
    });

    it('for not creator should not create RTC connection with old users in call', (done) => {
      const apiMock = new APIMock(bob);
      const rtcPoolRepo = new RTCPoolRepository(config.chat.rtc, loggerFactory, apiMock);
      const callFactory2 = new CallFactory(loggerFactory, apiMock, rtcPoolRepo);
      spyOn(apiMock, 'getCallUsers').and.returnValue(Promise.resolve([aliceSessionId, bob, chad, david]));
      spyOn(RTCPool.prototype, 'connect').and.callFake((_u: string) => done.fail());

      // tslint:disable-next-line
      callFactory2.create(makeGroupCall(aliceSessionId, [aliceSessionId, david])) as GroupCall;
      done();
    });

    it('should retrieve history', (done) => {
      call.getMessages().then((msgs) => {
        const tss = msgs.map((m) => m.timestamp);
        expect(tss).toContain(msg1Mock);
        expect(tss).toContain(msg2Mock);
        done();
      });
    });

    it('should allow rejecting', (done) => {
      spyOn(log, 'error');

      call.reject(CallReason.CallRejected).then(() => {
        expect(api.rejected).toBe(CallReason.CallRejected);
        done();
      });
      expect(log.error).not.toHaveBeenCalled();
    });

    whenever(isWebRTCSupported())('should run a callback on join', (done) => {
      spyOn(log, 'error');
      getStream((stream) => {
        call.addTracks(stream.getTracks());

        call.joined$.subscribe((msg) => {
          expect(msg.authorId).toBe(chad);
          done();
        });

        api.cb(new callEvents.Joined(call.id, chad, Date.now()));
      }, (_error) => done.fail());
      expect(log.error).not.toHaveBeenCalled();
    });

    it('should run a callback on leave', (done) => {
      spyOn(log, 'error');

      call.left$.subscribe((msg) => {
        expect(msg.authorId).toBe(aliceSessionId);
        done();
      });

      api.cb(new callEvents.Left(call.id, aliceSessionId, EndReason.CallRejected, Date.now()));
      expect(log.error).not.toHaveBeenCalled();
    });

    it('should run a callback on offline call action', (done) => {
      spyOn(log, 'error');

      call.offline$.subscribe((msg) => {
        expect(msg.userId).toBe(aliceSessionId);
        done();
      });

      api.cb(new callEvents.DeviceOffline(call.id, aliceSessionId, deviceIdMock, Date.now()));
      expect(log.error).not.toHaveBeenCalled();
    });

    it('should run a callback on online call action', (done) => {
      spyOn(log, 'error');

      call.online$.subscribe((msg) => {
        expect(msg.userId).toBe(aliceSessionId);
        done();
      });

      api.cb(new callEvents.DeviceOnline(call.id, aliceSessionId, deviceIdMock, Date.now()));
      expect(log.error).not.toHaveBeenCalled();
    });

    it('should run a callback on answer', (done) => {
      spyOn(log, 'error');

      call.answered$.subscribe((msg) => {
        expect(msg.authorId).toBe(aliceSessionId);
        done();
      });

      api.cb(new callEvents.Answered(call.id, aliceSessionId, Date.now()));
      expect(log.error).not.toHaveBeenCalled();
    });

    whenever(isWebRTCSupported())('should run a callback on active device', (done) => {
      spyOn(log, 'error');
      getStream((stream) => {
        call.pull(stream.getTracks());

        call.activeDevice$.subscribe((msg) => {
          expect(msg.authorId).toBe(chad);
          done();
        });

        api.cb(new callEvents.CallHandledOnDevice(call.id, chad, deviceIdMock, Date.now()));
      }, (_error) => done.fail());
      expect(log.error).not.toHaveBeenCalled();
    });

    it('should run a callback on reject', (done) => {
      spyOn(log, 'error');

      call.rejected$.subscribe((msg) => {
        expect(msg.authorId).toBe(aliceSessionId);
        done();
      });

      api.cb(new callEvents.Rejected(call.id, aliceSessionId, EndReason.Disconnected, Date.now()));
      expect(log.error).not.toHaveBeenCalled();
    });

    it('should run a callback on end', (done) => {
      spyOn(log, 'error');

      call.end$.subscribe((msg) => {
        expect(msg.reason).toBe(EndReason.Disconnected);
        done();
      });

      api.cb(new callEvents.Ended(call.id, EndReason.Disconnected, Date.now()));
      expect(log.error).not.toHaveBeenCalled();
    });

    it('should run a callback on ActiveDevice', (done) => {
      const deviceId = 'aliceDevice';
      spyOn(log, 'error');

      call.activeDevice$.subscribe((msg) => {
        expect(msg.callId).toBe(call.id);
        expect(msg.device).toBe(deviceId);
        done();
      });

      api.cb(new callEvents.CallHandledOnDevice(call.id, aliceSessionId, deviceId, Date.now()));
      expect(log.error).not.toHaveBeenCalled();
    });

    whenever(isWebRTCSupported())('should maintain the user list', (done) => {
      spyOn(log, 'error');
      getStream((stream) => {
        call.addTracks(stream.getTracks());

        call.joined$.subscribe((msg1) => {
          expect(msg1.authorId).toBe(bob);

          call.getUsers().then((users1) => {
            expect(users1).toContain(bob);
            expect(users1).toContain(aliceSessionId);

            call.left$.subscribe((msg2) => {
              expect(msg2.authorId).toBe(aliceSessionId);

              call.getUsers().then((users2) => {
                expect(users2).toContain(bob);
                expect(users2).not.toContain(aliceSessionId);
                done();
              });
            });

            api.cb(new callEvents.Left(call.id, aliceSessionId, EndReason.Disconnected, Date.now()));
          });
        });

        api.cb(new callEvents.Joined(call.id, bob, Date.now()));
      }, (_error) => done.fail());
      expect(log.error).not.toHaveBeenCalled();
    });

    // FIXME These should be moved to integration tests:
    whenever(isWebRTCSupported())('should allow answering', (done) => {
      spyOn(log, 'error');
      getStream((stream) => {

        call.answer(stream.getTracks()).then(() => {
          expect(api.answered).toBe(true);
          done();
        });
      }, (_error) => done.fail());
      expect(log.error).not.toHaveBeenCalled();
    });

    it('should allow leaving', (done) => {
      spyOn(log, 'error');
      call.leave(CallReason.CallRejected).then(() => {
        expect(api.left).toBe(CallReason.CallRejected);
        done();
      });
      expect(log.error).not.toHaveBeenCalled();
    });
  });
});

describe('GroupCall', () => {
  let api: APIMock;
  let call: GroupCall;

  beforeEach(() => {
    api = new APIMock(sessionIdMock);
    const rtcPoolRepository = new RTCPoolRepository(config.chat.rtc, loggerFactory, api);
    const callFactory = new CallFactory(loggerFactory, api, rtcPoolRepository);
    call = callFactory.create(makeCall(CallType.GROUP)) as GroupCall;
  });

  it('should run a callback on invitation', (done) => {
    spyOn(log, 'error');
    const metadata = {exampleField: 'exampleField'};
    call.invited$.subscribe((msg) => {
      expect(msg.authorId).toBe(aliceSessionId);
      expect(msg.invitee).toBe(chad);
      expect(msg.metadata).toBe(metadata);
      done();
    });

    api.cb(new callEvents.Invited(call.id, aliceSessionId, chad, Date.now(), metadata));
    expect(log.error).not.toHaveBeenCalled();
  });

  // FIXME These should be moved to integration tests:
  whenever(isWebRTCSupported())('should allow joining', (done) => {
    spyOn(log, 'error');
    getStream((stream) => {

      call.join(stream.getTracks()).then(() => {
        expect(api.joined).toBe(true);
        done();
      });
    }, (_error) => done.fail());
    expect(log.error).not.toHaveBeenCalled();
  });

  it('should allow inviting users', (done) => {
    spyOn(log, 'error');
    call.invite(bob).then(() => {
      expect(api.invited).toBe(bob);
      done();
    });
    expect(log.error).not.toHaveBeenCalled();
  });
});

describe('DirectCall, GroupCall', () => {
  const api = new APIMock(sessionIdMock);
  const rtcPoolRepository = new RTCPoolRepository(config.chat.rtc, loggerFactory, api);
  const callFactory = new CallFactory(loggerFactory, api, rtcPoolRepository);

  it('should have proper callType field defined', () => {
    const directCall: Call = callFactory.create(makeCall(CallType.DIRECT));
    const groupCall: Call = callFactory.create(makeCall(CallType.GROUP));
    expect(directCall.callType).toEqual(CallType.DIRECT);
    expect(groupCall.callType).toEqual(CallType.GROUP);
  });
});
