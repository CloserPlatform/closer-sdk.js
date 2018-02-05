import {ArtichokeAPI, CallReason} from "./api";
import {Call, callType as ct, createCall, GroupCall} from "./call";
import {EventHandler} from "./events";
import {apiKey, config, getStream, isWebRTCSupported, log, sessionId, whenever} from "./fixtures.spec";
import {Event} from "./protocol/events";
import {ID} from "./protocol/protocol";
import {Call as ProtoCall, Message} from "./protocol/wire-entities";
import {actionTypes, codec, eventTypes, Invitee} from "./protocol/wire-events";
import {RTCPool} from "./rtc";
import CallType = ct.CallType;

const callId = "123";
const alice = "321";
const bob = "456";
const chad = "987";
const david = "654";
const msg1 = "2323";
const msg2 = "1313";

function msg(id: string): Message {
  return {
    type: "message",
    id,
    body: "Hi!",
    tag: actionTypes.CALL_JOINED,
    userId: alice,
    channel: callId,
    timestamp: 123,
  };
}

class APIMock extends ArtichokeAPI {
  joined = false;
  left: string;
  answered = false;
  rejected: string;
  invited: string;

  constructor(sessionId) {
    super(sessionId, apiKey, config.chat, log);
  }

  getCallHistory(id) {
    return Promise.resolve([msg(msg1), msg(msg2)]);
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
      throw Error("invalid CallType");
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

["DirectCall", "GroupCall"].forEach((d) => {
  describe(d, () => {
    let events;
    let api;
    let call;

    beforeEach(() => {
      events = new EventHandler(log, codec);
      api = new APIMock(sessionId);
      const callType = d === "DirectCall" ? CallType.DIRECT : CallType.GROUP;
      call = createCall(makeCall(callType), config.chat.rtc, log, events, api);
    });

    it("for creator should create RTC connection with old users in call", (done) => {
      const api = new APIMock(alice);
      spyOn(api, "getCallUsers").and.returnValue(Promise.resolve([alice, bob, chad, david]));

      const usersToOffer = new Set([bob, chad, david]);
      const usersNotToOffer = new Set([alice]);

      spyOn(RTCPool.prototype, "create").and.callFake((u) => {
        if (usersNotToOffer.has(u)) {
          done.fail();
        } else {
          usersToOffer.delete(u);
          if (usersToOffer.size === 0) {
            done();
          }
        }
      });
      createCall(makeGroupCall(alice, [alice, david]), config.chat.rtc, log, events, api) as GroupCall;

    });

    it("for not creator should not create RTC connection with old users in call", (done) => {
      const api = new APIMock(bob);
      spyOn(api, "getCallUsers").and.returnValue(Promise.resolve([alice, bob, chad, david]));
      spyOn(RTCPool.prototype, "create").and.callFake((u) => done.fail());
      createCall(makeGroupCall(alice, [alice, david]), config.chat.rtc, log, events, api) as GroupCall;
      done();
    });

    it("should retrieve history", (done) => {
      call.getMessages().then((msgs) => {
        let ids = msgs.map((m) => m.id);
        expect(ids).toContain(msg1);
        expect(ids).toContain(msg2);
        done();
      });
    });

    it("should allow rejecting", (done) => {
      events.onEvent(eventTypes.ERROR, (error) => done.fail());

      call.reject(CallReason.CallRejected).then(() => {
        expect(api.rejected).toBe(CallReason.CallRejected);
        done();
      });
    });

    whenever(isWebRTCSupported())("should run a callback on join", (done) => {
      getStream((stream) => {
        call.addStream(stream);

        events.onEvent(eventTypes.ERROR, (error) => done.fail());

        call.onJoined((msg) => {
          expect(msg.userId).toBe(chad);
          done();
        });

        events.notify({
          type: eventTypes.CALL_MESSAGE,
          id: call.id,
          message: {
            type: "message",
            tag: actionTypes.CALL_JOINED,
            channel: call.id,
            userId:  chad,
            timestamp: Date.now()
          }
        } as Event);
      }, (error) => done.fail());
    });

    it("should run a callback on leave", (done) => {
      events.onEvent(eventTypes.ERROR, (error) => done.fail());

      call.onLeft((msg) => {
        expect(msg.userId).toBe(alice);
        done();
      });

      events.notify({
        type: eventTypes.CALL_MESSAGE,
        id: call.id,
        message: {
          type: "message",
          tag: actionTypes.CALL_LEFT,
          call: call.id,
          userId:  alice,
          timestamp: Date.now(),
          context: {
            reason: "reason"
          }
        }
      } as Event);
    });

    it("should run a callback on offline call action", (done) => {
      events.onEvent(eventTypes.ERROR, (error) => done.fail());

      call.onOffline((msg) => {
        expect(msg.userId).toBe(alice);
        done();
      });

      events.notify({
        type: eventTypes.CALL_MESSAGE,
        id: call.id,
        message: {
          type: "mesage",
          tag: actionTypes.OFFLINE,
          call: call.id,
          userId:  alice,
          timestamp: Date.now(),
        }
      } as Event);
    });

    it("should run a callback on online call action", (done) => {
      events.onEvent(eventTypes.ERROR, (error) => done.fail());

      call.onOnline((msg) => {
        expect(msg.userId).toBe(alice);
        done();
      });

      events.notify({
        type: eventTypes.CALL_MESSAGE,
        id: call.id,
        message: {
          type: "message",
          tag: actionTypes.ONLINE,
          call: call.id,
          userId:  alice,
          timestamp: Date.now(),
        }
      } as Event);
    });

    it("should run a callback on answer", (done) => {
      events.onEvent(eventTypes.ERROR, (error) => done.fail());

      call.onAnswered((msg) => {
        expect(msg.userId).toBe(alice);
        done();
      });

      events.notify({
        type: eventTypes.CALL_MESSAGE,
        id: call.id,
        message: {
          type: "message",
          tag: actionTypes.CALL_ANSWERED,
          call: call.id,
          userId:  alice,
          timestamp: Date.now()
        }
      } as Event);
    });

    whenever(isWebRTCSupported())("should run a callback on transferred", (done) => {
      getStream((stream) => {
        call.pull(stream);

        events.onEvent(eventTypes.ERROR, (error) => done.fail());

        call.onTransferred((msg) => {
          expect(msg.userId).toBe(chad);
          done();
        });

        events.notify({
          type: eventTypes.CALL_MESSAGE,
          id: call.id,
          message: {
            type: "message",
            tag: actionTypes.CALL_TRANSFERRED,
            call: call.id,
            userId:  chad,
            timestamp: Date.now()
          }
        } as Event);
      }, (error) => done.fail());
    });

    it("should run a callback on reject", (done) => {
      events.onEvent(eventTypes.ERROR, (error) => done.fail());

      call.onRejected((msg) => {
        expect(msg.userId).toBe(alice);
        done();
      });

      events.notify({
        type: eventTypes.CALL_MESSAGE,
        id: call.id,
        message: {
          type: "message",
          tag: actionTypes.CALL_REJECTED,
          call: call.id,
          userId:  alice,
          timestamp: Date.now(),
          reason: "reason"
        }
      } as Event);
    });

    it("should run a callback on end", (done) => {
      events.onEvent(eventTypes.ERROR, (error) => done.fail());

      call.onEnd((msg) => {
        expect(msg.reason).toBe("reason");
        done();
      });

      events.notify({
        type: eventTypes.CALL_END,
        id: call.id,
        reason: "reason"
      } as Event);
    });

    it("should run a callback on ActiveDevice", (done) => {
      events.onEvent(eventTypes.ERROR, (error) => done.fail());
      const deviceId = "aliceDevice";

      call.onActiveDevice((msg) => {
        expect(msg.id).toBe(call.id);
        expect(msg.device).toBe(deviceId);
        done();
      });

      events.notify({
        type: eventTypes.CALL_ACTIVE_DEVICE,
        id: call.id,
        device: deviceId
      } as Event);
    });

    whenever(isWebRTCSupported())("should maintain the user list", (done) => {
      getStream((stream) => {
        call.addStream(stream);

        events.onEvent(eventTypes.ERROR, (error) => done.fail());

        call.onJoined((msg1) => {
          expect(msg1.userId).toBe(bob);

          call.getUsers().then((users1) => {
            expect(users1).toContain(bob);
            expect(users1).toContain(alice);

            call.onLeft((msg2) => {
              expect(msg2.userId).toBe(alice);

              call.getUsers().then((users2) => {
                expect(users2).toContain(bob);
                expect(users2).not.toContain(alice);
                done();
              });
            });

            events.notify({
              type: eventTypes.CALL_MESSAGE,
              id: call.id,
              message: {
                type: "message",
                tag: actionTypes.CALL_LEFT,
                call: call.id,
                userId:  alice,
                timestamp: Date.now(),
                context: {
                  reason: "reason"
                }
              }
            } as Event);
          });
        });

        events.notify({
          type: eventTypes.CALL_MESSAGE,
          id: call.id,
          message: {
            type: "message",
            tag: actionTypes.CALL_JOINED,
            call: call.id,
            userId:  bob,
            timestamp: Date.now()
          }
        } as Event);
      }, (error) => done.fail());
    });

    // FIXME These should be moved to integration tests:
    whenever(isWebRTCSupported())("should allow answering", (done) => {
      getStream((stream) => {
        events.onEvent(eventTypes.ERROR, (error) => done.fail());

        call.answer(stream).then(() => {
          expect(api.answered).toBe(true);
          done();
        });
      }, (error) => done.fail());
    });

    it("should allow leaving", (done) => {
      events.onEvent(eventTypes.ERROR, (error) => done.fail());

      call.leave(CallReason.CallRejected).then(() => {
        expect(api.left).toBe(CallReason.CallRejected);
        done();
      });
    });
  });
});

describe("GroupCall", () => {
  let events;
  let api;
  let call;

  beforeEach(() => {
    events = new EventHandler(log, codec);
    api = new APIMock(sessionId);
    call = createCall(makeCall(CallType.GROUP), config.chat.rtc, log, events, api) as GroupCall;
  });

  it("should run a callback on invitation", (done) => {
    events.onEvent(eventTypes.ERROR, (error) => done.fail());

    call.onInvited((msg) => {
      expect(msg.userId).toBe(alice);
      expect((msg.context as Invitee).invitee).toBe(chad);
      done();
    });

    events.notify({
      type: eventTypes.CALL_MESSAGE,
      id: call.id,
      message: {
        type: "message",
        tag: actionTypes.CALL_INVITED,
        call: call.id,
        userId:  alice,
        context: {
          invitee: chad
        }
      }
    } as Event);
  });

  // FIXME These should be moved to integration tests:
  whenever(isWebRTCSupported())("should allow joining", (done) => {
    getStream((stream) => {
      events.onEvent(eventTypes.ERROR, (error) => done.fail());

      call.join(stream).then(() => {
        expect(api.joined).toBe(true);
        done();
      });
    }, (error) => done.fail());
  });

  it("should allow inviting users", (done) => {
    events.onEvent(eventTypes.ERROR, (error) => done.fail());

    call.invite(bob).then(() => {
      expect(api.invited).toBe(bob);
      done();
    });
  });
});

describe("DirectCall, GroupCall", () => {
  const events = new EventHandler(log, codec);
  const api = new APIMock(sessionId);

  it("should have proper callType field defined", () => {
    const directCall: Call = createCall(makeCall(CallType.DIRECT), config.chat.rtc, log, events, api);
    const groupCall: Call = createCall(makeCall(CallType.GROUP), config.chat.rtc, log, events, api);
    expect(directCall.callType).toEqual(CallType.DIRECT);
    expect(groupCall.callType).toEqual(CallType.GROUP);
  });
});
