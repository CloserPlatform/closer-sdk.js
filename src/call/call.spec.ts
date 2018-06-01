import { Call, callType as ct, createCall, GroupCall } from './call';
import { EventHandler } from '../events/events';
import {
  apiKeyMock, config, deviceIdMock, getStream, isWebRTCSupported, log, sessionIdMock, whenever
} from '../test-utils';
import { callEvents } from '../protocol/events/call-events';
import { decoder } from '../protocol/events/domain-event';
import { errorEvents } from '../protocol/events/error-events';
import { ID } from '../protocol/protocol';
import { Call as ProtoCall } from '../protocol/wire-entities';
import { RTCPool } from '../rtc/rtc';
import EndReason = callEvents.EndReason;
import CallType = ct.CallType;
import { ArtichokeAPI } from '../apis/artichoke-api';
import { CallReason } from '../apis/call-reason';

const callId = '123';
const alice = '321';
const bob = '456';
const chad = '987';
const david = '654';
const msg1Mock = 2323;
const msg2Mock = 1313;

function msgFn(ts: number): callEvents.Joined {
  return new callEvents.Joined(callId, alice, ts);
}

class APIMock extends ArtichokeAPI {
  joined = false;
  left: string;
  answered = false;
  rejected: string;
  invited: string;

  constructor(sessionId) {
    super(sessionId, apiKeyMock, config.chat, log);
  }

  getCallHistory(id) {
    return Promise.resolve([msgFn(msg1Mock), msgFn(msg2Mock)]);
  }

  getCallUsers(id) {
    return Promise.resolve([alice, bob, chad]);
  }

  answerCall(id) {
    this.answered = true;
    return Promise.resolve(undefined);
  }

  rejectCall(id, reason: CallReason) {
    this.rejected = reason;
    return Promise.resolve(undefined);
  }

  joinCall(id) {
    this.joined = true;
    return Promise.resolve(undefined);
  }

  leaveCall(id, reason: CallReason) {
    this.left = reason;
    return Promise.resolve(undefined);
  }

  pullCall(id) {
    return Promise.resolve(undefined);
  }

  inviteToCall(id, peer) {
    this.invited = peer;
    return Promise.resolve(undefined);
  }

  sendDescription(id, peer, sdp) {
    return Promise.resolve();
  }

  sendCandidate(id, peer, candidate) {
    return Promise.resolve();
  }
}

function makeCall(callType: CallType) {
  const call = {
    id: callId,
    created: 123,
    creator: alice,
    users: [alice],
  } as ProtoCall;

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
}

function makeGroupCall(creator: ID, users: Array<ID>) {
  return {
    id: callId,
    created: 123,
    creator,
    users,
    direct: false,
  } as ProtoCall;
}

['DirectCall', 'GroupCall'].forEach((d) => {
  describe(d, () => {
    let events;
    let api;
    let call: Call;

    beforeEach(() => {
      events = new EventHandler(log, decoder);
      api = new APIMock(sessionIdMock);
      const callType = d === 'DirectCall' ? CallType.DIRECT : CallType.GROUP;
      call = createCall(makeCall(callType), config.chat.rtc, log, events, api);
    });

    it('for creator should create RTC connection with old users in call', (done) => {
      const apiMock = new APIMock(alice);
      spyOn(apiMock, 'getCallUsers').and.returnValue(Promise.resolve([alice, bob, chad, david]));

      const usersToOffer = new Set([bob, chad, david]);
      const usersNotToOffer = new Set([alice]);

      spyOn(RTCPool.prototype, 'create').and.callFake((u) => {
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
      spyOn(RTCPool.prototype, 'create').and.callFake((u) => done.fail());

      // tslint:disable-next-line
      createCall(makeGroupCall(alice, [alice, david]), config.chat.rtc, log, events, apiMock) as GroupCall;
      done();
    });

    it('should retrieve history', (done) => {
      call.getMessages().then((msgs) => {
        let tss = msgs.map((m) => m.timestamp);
        expect(tss).toContain(msg1Mock);
        expect(tss).toContain(msg2Mock);
        done();
      });
    });

    it('should allow rejecting', (done) => {
      events.onEvent(errorEvents.Error.tag, (error) => done.fail());

      call.reject(CallReason.CallRejected).then(() => {
        expect(api.rejected).toBe(CallReason.CallRejected);
        done();
      });
    });

    whenever(isWebRTCSupported())('should run a callback on join', (done) => {
      getStream((stream) => {
        call.addStream(stream);

        events.onEvent(errorEvents.Error.tag, (error) => done.fail());

        call.onJoined((msg) => {
          expect(msg.authorId).toBe(chad);
          done();
        });

        events.notify(new callEvents.Joined(call.id, chad, Date.now()));
      }, (error) => done.fail());
    });

    it('should run a callback on leave', (done) => {
      events.onEvent(errorEvents.Error.tag, (error) => done.fail());

      call.onLeft((msg) => {
        expect(msg.authorId).toBe(alice);
        done();
      });

      events.notify(new callEvents.Left(call.id, alice, EndReason.CallRejected, Date.now()));
    });

    it('should run a callback on offline call action', (done) => {
      events.onEvent(errorEvents.Error.tag, (error) => done.fail());

      call.onOffline((msg) => {
        expect(msg.userId).toBe(alice);
        done();
      });

      events.notify(new callEvents.DeviceOffline(call.id, alice, deviceIdMock, Date.now()));
    });

    it('should run a callback on online call action', (done) => {
      events.onEvent(errorEvents.Error.tag, (error) => done.fail());

      call.onOnline((msg) => {
        expect(msg.userId).toBe(alice);
        done();
      });

      events.notify(new callEvents.DeviceOnline(call.id, alice, deviceIdMock, Date.now()));
    });

    it('should run a callback on answer', (done) => {
      events.onEvent(errorEvents.Error.tag, (error) => done.fail());

      call.onAnswered((msg) => {
        expect(msg.authorId).toBe(alice);
        done();
      });

      events.notify(new callEvents.Answered(call.id, alice, Date.now()));
    });

    whenever(isWebRTCSupported())('should run a callback on active device', (done) => {
      getStream((stream) => {
        call.pull(stream);

        events.onEvent(errorEvents.Error.tag, (error) => done.fail());

        call.onActiveDevice((msg) => {
          expect(msg.authorId).toBe(chad);
          done();
        });

        events.notify(new callEvents.CallHandledOnDevice(call.id, chad, deviceIdMock, Date.now()));
      }, (error) => done.fail());
    });

    it('should run a callback on reject', (done) => {
      events.onEvent(errorEvents.Error.tag, (error) => done.fail());

      call.onRejected((msg) => {
        expect(msg.authorId).toBe(alice);
        done();
      });

      events.notify(new callEvents.Rejected(call.id, alice, EndReason.Disconnected, Date.now()));
    });

    it('should run a callback on end', (done) => {
      events.onEvent(errorEvents.Error.tag, (error) => done.fail());

      call.onEnd((msg) => {
        expect(msg.reason).toBe(EndReason.Disconnected);
        done();
      });

      events.notify(new callEvents.Ended(call.id, EndReason.Disconnected, Date.now()));
    });

    it('should run a callback on ActiveDevice', (done) => {
      events.onEvent(errorEvents.Error.tag, (error) => done.fail());
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

        events.onEvent(errorEvents.Error.tag, (error) => done.fail());

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
      }, (error) => done.fail());
    });

    // FIXME These should be moved to integration tests:
    whenever(isWebRTCSupported())('should allow answering', (done) => {
      getStream((stream) => {
        events.onEvent(errorEvents.Error.tag, (error) => done.fail());

        call.answer(stream).then(() => {
          expect(api.answered).toBe(true);
          done();
        });
      }, (error) => done.fail());
    });

    it('should allow leaving', (done) => {
      events.onEvent(errorEvents.Error.tag, (error) => done.fail());

      call.leave(CallReason.CallRejected).then(() => {
        expect(api.left).toBe(CallReason.CallRejected);
        done();
      });
    });
  });
});

describe('GroupCall', () => {
  let events;
  let api;
  let call: GroupCall;

  beforeEach(() => {
    events = new EventHandler(log, decoder);
    api = new APIMock(sessionIdMock);
    call = createCall(makeCall(CallType.GROUP), config.chat.rtc, log, events, api) as GroupCall;
  });

  it('should run a callback on invitation', (done) => {
    events.onEvent(errorEvents.Error.tag, (error) => done.fail());

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
      events.onEvent(errorEvents.Error.tag, (error) => done.fail());

      call.join(stream).then(() => {
        expect(api.joined).toBe(true);
        done();
      });
    }, (error) => done.fail());
  });

  it('should allow inviting users', (done) => {
    events.onEvent(errorEvents.Error.tag, (error) => done.fail());

    call.invite(bob).then(() => {
      expect(api.invited).toBe(bob);
      done();
    });
  });
});

describe('DirectCall, GroupCall', () => {
  const events = new EventHandler(log, decoder);
  const api = new APIMock(sessionIdMock);

  it('should have proper callType field defined', () => {
    const directCall: Call = createCall(makeCall(CallType.DIRECT), config.chat.rtc, log, events, api);
    const groupCall: Call = createCall(makeCall(CallType.GROUP), config.chat.rtc, log, events, api);
    expect(directCall.callType).toEqual(CallType.DIRECT);
    expect(groupCall.callType).toEqual(CallType.GROUP);
  });
});
