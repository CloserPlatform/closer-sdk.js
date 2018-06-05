// tslint:disable:max-file-line-count
import { Call } from './call';
import { EventHandler } from '../events/event-handler';
import {
  apiKeyMock, config, deviceIdMock, getStream, isWebRTCSupported, log, sessionIdMock, whenever
} from '../test-utils';
import { callEvents } from '../protocol/events/call-events';
import { errorEvents } from '../protocol/events/error-events';
import { ID } from '../protocol/protocol';
import { Call as ProtoCall } from '../protocol/wire-entities';
import EndReason = callEvents.EndReason;
import { ArtichokeAPI } from '../apis/artichoke-api';
import { CallReason } from '../apis/call-reason';
import { CallType } from './call-type';
import { createCall } from './create-call';
import { GroupCall } from './group-call';
import { RTCPool } from '../rtc/rtc-pool';
import CallEvent = callEvents.CallEvent;
// FIXME
// tslint:disable:no-any

const callId = '123';
const alice = '321';
const bob = '456';
const chad = '987';
const david = '654';
const msg1Mock = 2323;
const msg2Mock = 1313;

const msgFn = (ts: number): callEvents.Joined =>
  new callEvents.Joined(callId, alice, ts);

class APIMock extends ArtichokeAPI {
  public joined = false;
  public left: string;
  public answered = false;
  public rejected: string;
  public invited: string;

  constructor(sessionId: string) {
    super(sessionId, apiKeyMock, config.chat, log);
  }

  public getCallHistory(_id: string): Promise<CallEvent[]> {
    return Promise.resolve([msgFn(msg1Mock), msgFn(msg2Mock)]);
  }

  public getCallUsers(_id: string): Promise<string[]> {
    return Promise.resolve([alice, bob, chad]);
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

  public inviteToCall(_id: string, peer: any): Promise<void> {
    this.invited = peer;

    return Promise.resolve(undefined);
  }

  public sendDescription(_id: string, _peer: any, _sdp: any): Promise<void> {
    return Promise.resolve();
  }

  public sendCandidate(_id: string, _peer: any, _candidate: any): Promise<void> {
    return Promise.resolve();
  }
}

const makeCall = (callType: CallType): ProtoCall => {
  const call: ProtoCall = {
    id: callId,
    created: 123,
    creator: alice,
    users: [alice],
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

const makeGroupCall = (creator: ID, users: Array<ID>): ProtoCall =>
  ({
    id: callId,
    created: 123,
    creator,
    users,
    direct: false,
  });

['DirectCall', 'GroupCall'].forEach((d) => {
  describe(d, () => {
    let events: any;
    let api: any;
    let call: Call;

    beforeEach(() => {
      events = new EventHandler(log);
      api = new APIMock(sessionIdMock);
      const callType = d === 'DirectCall' ? CallType.DIRECT : CallType.GROUP;
      call = createCall(makeCall(callType), config.chat.rtc, log, events, api);
    });

    it('for creator should create RTC connection with old users in call', (done) => {
      const apiMock = new APIMock(alice);
      spyOn(apiMock, 'getCallUsers').and.returnValue(Promise.resolve([alice, bob, chad, david]));

      const usersToOffer = new Set([bob, chad, david]);
      const usersNotToOffer = new Set([alice]);

      spyOn(RTCPool.prototype, 'create').and.callFake((u: any) => {
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
      createCall(makeGroupCall(alice, [alice, david]), config.chat.rtc, log, events, apiMock) as GroupCall;
    });

    it('for not creator should not create RTC connection with old users in call', (done) => {
      const apiMock = new APIMock(bob);
      spyOn(apiMock, 'getCallUsers').and.returnValue(Promise.resolve([alice, bob, chad, david]));
      spyOn(RTCPool.prototype, 'create').and.callFake((_u: any) => done.fail());

      // tslint:disable-next-line
      createCall(makeGroupCall(alice, [alice, david]), config.chat.rtc, log, events, apiMock) as GroupCall;
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
      events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

      call.reject(CallReason.CallRejected).then(() => {
        expect(api.rejected).toBe(CallReason.CallRejected);
        done();
      });
    });

    whenever(isWebRTCSupported())('should run a callback on join', (done) => {
      getStream((stream) => {
        call.addStream(stream);

        events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

        call.onJoined((msg) => {
          expect(msg.authorId).toBe(chad);
          done();
        });

        events.notify(new callEvents.Joined(call.id, chad, Date.now()));
      }, (_error) => done.fail());
    });

    it('should run a callback on leave', (done) => {
      events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

      call.onLeft((msg) => {
        expect(msg.authorId).toBe(alice);
        done();
      });

      events.notify(new callEvents.Left(call.id, alice, EndReason.CallRejected, Date.now()));
    });

    it('should run a callback on offline call action', (done) => {
      events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

      call.onOffline((msg) => {
        expect(msg.userId).toBe(alice);
        done();
      });

      events.notify(new callEvents.DeviceOffline(call.id, alice, deviceIdMock, Date.now()));
    });

    it('should run a callback on online call action', (done) => {
      events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

      call.onOnline((msg) => {
        expect(msg.userId).toBe(alice);
        done();
      });

      events.notify(new callEvents.DeviceOnline(call.id, alice, deviceIdMock, Date.now()));
    });

    it('should run a callback on answer', (done) => {
      events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

      call.onAnswered((msg) => {
        expect(msg.authorId).toBe(alice);
        done();
      });

      events.notify(new callEvents.Answered(call.id, alice, Date.now()));
    });

    whenever(isWebRTCSupported())('should run a callback on active device', (done) => {
      getStream((stream) => {
        call.pull(stream);

        events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

        call.onActiveDevice((msg) => {
          expect(msg.authorId).toBe(chad);
          done();
        });

        events.notify(new callEvents.CallHandledOnDevice(call.id, chad, deviceIdMock, Date.now()));
      }, (_error) => done.fail());
    });

    it('should run a callback on reject', (done) => {
      events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

      call.onRejected((msg) => {
        expect(msg.authorId).toBe(alice);
        done();
      });

      events.notify(new callEvents.Rejected(call.id, alice, EndReason.Disconnected, Date.now()));
    });

    it('should run a callback on end', (done) => {
      events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

      call.onEnd((msg) => {
        expect(msg.reason).toBe(EndReason.Disconnected);
        done();
      });

      events.notify(new callEvents.Ended(call.id, EndReason.Disconnected, Date.now()));
    });

    it('should run a callback on ActiveDevice', (done) => {
      events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());
      const deviceId = 'aliceDevice';

      call.onActiveDevice((msg) => {
        expect(msg.callId).toBe(call.id);
        expect(msg.device).toBe(deviceId);
        done();
      });

      events.notify(new callEvents.CallHandledOnDevice(call.id, alice, deviceId, Date.now()));
    });

    whenever(isWebRTCSupported())('should maintain the user list', (done) => {
      getStream((stream) => {
        call.addStream(stream);

        events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

        call.onJoined((msg1) => {
          expect(msg1.authorId).toBe(bob);

          call.getUsers().then((users1) => {
            expect(users1).toContain(bob);
            expect(users1).toContain(alice);

            call.onLeft((msg2) => {
              expect(msg2.authorId).toBe(alice);

              call.getUsers().then((users2) => {
                expect(users2).toContain(bob);
                expect(users2).not.toContain(alice);
                done();
              });
            });

            events.notify(new callEvents.Left(call.id, alice, EndReason.Disconnected, Date.now()));
          });
        });

        events.notify(new callEvents.Joined(call.id, bob, Date.now()));
      }, (_error) => done.fail());
    });

    // FIXME These should be moved to integration tests:
    whenever(isWebRTCSupported())('should allow answering', (done) => {
      getStream((stream) => {
        events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

        call.answer(stream).then(() => {
          expect(api.answered).toBe(true);
          done();
        });
      }, (_error) => done.fail());
    });

    it('should allow leaving', (done) => {
      events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

      call.leave(CallReason.CallRejected).then(() => {
        expect(api.left).toBe(CallReason.CallRejected);
        done();
      });
    });
  });
});

describe('GroupCall', () => {
  let events: any;
  let api: any;
  let call: GroupCall;

  beforeEach(() => {
    events = new EventHandler(log);
    api = new APIMock(sessionIdMock);
    call = createCall(makeCall(CallType.GROUP), config.chat.rtc, log, events, api) as GroupCall;
  });

  it('should run a callback on invitation', (done) => {
    events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

    const ctx = {exampleField: 'exampleField'};
    call.onInvited((msg) => {
      expect(msg.authorId).toBe(alice);
      expect(msg.invitee).toBe(chad);
      expect(msg.context).toBe(ctx);
      done();
    });

    events.notify(new callEvents.Invited(call.id, alice, chad, ctx, Date.now()));
  });

  // FIXME These should be moved to integration tests:
  whenever(isWebRTCSupported())('should allow joining', (done) => {
    getStream((stream) => {
      events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

      call.join(stream).then(() => {
        expect(api.joined).toBe(true);
        done();
      });
    }, (_error) => done.fail());
  });

  it('should allow inviting users', (done) => {
    events.onEvent(errorEvents.Error.tag, (_error: any) => done.fail());

    call.invite(bob).then(() => {
      expect(api.invited).toBe(bob);
      done();
    });
  });
});

describe('DirectCall, GroupCall', () => {
  const events = new EventHandler(log);
  const api = new APIMock(sessionIdMock);

  it('should have proper callType field defined', () => {
    const directCall: Call = createCall(makeCall(CallType.DIRECT), config.chat.rtc, log, events, api);
    const groupCall: Call = createCall(makeCall(CallType.GROUP), config.chat.rtc, log, events, api);
    expect(directCall.callType).toEqual(CallType.DIRECT);
    expect(groupCall.callType).toEqual(CallType.GROUP);
  });
});
