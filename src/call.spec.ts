import { ArtichokeAPI } from "./api";
import { GroupCall, createCall, callType, Call } from "./call";
import { EventHandler } from "./events";
import { apiKey, config, getStream, isWebRTCSupported, log, whenever } from "./fixtures.spec";
import { Call as ProtoCall } from "./protocol/wire-entities";
import { Event } from "./protocol/events";
import { actionTypes, eventTypes } from "./protocol/wire-events";
import CallType = callType.CallType;

const callId = "123";
const alice = "321";
const bob = "456";
const chad = "987";

class APIMock extends ArtichokeAPI {
  joined = false;
  left: string;
  answered = false;
  rejected: string;
  invited: string;
  updates: Array<string> = [];

  constructor() {
    super(apiKey, config.chat, log);
  }

  answerCall(id) {
    this.answered = true;
    return Promise.resolve(undefined);
  }

  rejectCall(id, reason) {
    this.rejected = reason;
    return Promise.resolve(undefined);
  }

  joinCall(id) {
    this.joined = true;
    return Promise.resolve(undefined);
  }

  leaveCall(id, reason) {
    this.left = reason;
    return Promise.resolve(undefined);
  }

  inviteToCall(id, peer) {
    this.invited = peer;
    return Promise.resolve(undefined);
  }

  sendDescription(id, peer, sdp) {
    // Do nothing.
  }

  sendCandidate(id, peer, candidate) {
    // Do nothing.
  }

  updateStream(id, update) {
    this.updates.push(update);
  }
}

function makeCall(callType: CallType) {
  const call = {
    id: callId,
    created: 123,
    users: [alice],
  } as ProtoCall;

  switch(callType) {
    case CallType.DIRECT:
      call.direct = true;
      return call;

    case CallType.GROUP:
      call.direct = false;
      return call;

    default:
      throw Error("invalid CallType")
  }
}

["DirectCall", "GroupCall"].forEach((d) => {
  describe(d, () => {
    let events;
    let api;
    let call;

    beforeEach(() => {
      events = new EventHandler(log);
      api = new APIMock();
      const callType = d === "DirectCall" ? CallType.DIRECT : CallType.GROUP;
      call = createCall(makeCall(callType), config.chat.rtc, log, events, api);
    });

    it("should allow rejecting", (done) => {
      events.onError((error) => done.fail());

      call.reject("rejected").then(() => {
        expect(api.rejected).toBe("rejected");
        done();
      });
    });

    whenever(isWebRTCSupported())("should run a callback on join", (done) => {
      getStream((stream) => {
        (call as any).pool.addLocalStream(stream);

        events.onError((error) => done.fail());

        call.onJoined((msg) => {
          expect(msg.user).toBe(chad);
          done();
        });

        events.notify({
          type: eventTypes.CALL_ACTION,
          id: call.id,
          action: {
            action: actionTypes.JOINED,
            call: call.id,
            user: chad,
            timestamp: Date.now()
          }
        } as Event);
      }, (error) => done.fail());
    });

    it("should run a callback on leave", (done) => {
      events.onError((error) => done.fail());

      call.onLeft((msg) => {
        expect(msg.user).toBe(alice);
        done();
      });

      events.notify({
        type: eventTypes.CALL_ACTION,
        id: call.id,
        action: {
          action: actionTypes.LEFT,
          call: call.id,
          user: alice,
          timestamp: Date.now(),
          reason: "reason"
        }
      } as Event);
    });

    it("should run a callback on answer", (done) => {
      events.onError((error) => done.fail());

      call.onAnswered((msg) => {
        expect(msg.user).toBe(alice);
        done();
      });

      events.notify({
        type: eventTypes.CALL_ACTION,
        id: call.id,
        action: {
          action: actionTypes.ANSWERED,
          call: call.id,
          user: alice,
          timestamp: Date.now()
        }
      } as Event);
    });

    it("should run a callback on reject", (done) => {
      events.onError((error) => done.fail());

      call.onRejected((msg) => {
        expect(msg.user).toBe(alice);
        done();
      });

      events.notify({
        type: eventTypes.CALL_ACTION,
        id: call.id,
        action: {
          action: actionTypes.REJECTED,
          call: call.id,
          user: alice,
          timestamp: Date.now(),
          reason: "reason"
        }
      } as Event);
    });

    whenever(isWebRTCSupported())("should maintain the user list", (done) => {
      getStream((stream) => {
        (call as any).pool.addLocalStream(stream);

        events.onError((error) => done.fail());

        call.onJoined((msg1) => {
          expect(msg1.user).toBe(bob);

          call.getUsers().then((users1) => {
            expect(users1).toContain(bob);
            expect(users1).toContain(alice);

            call.onLeft((msg2) => {
              expect(msg2.user).toBe(alice);

              call.getUsers().then((users2) => {
                expect(users2).toContain(bob);
                expect(users2).not.toContain(alice);
                done();
              });
            });

            events.notify({
              type: eventTypes.CALL_ACTION,
              id: call.id,
              action: {
                action: actionTypes.LEFT,
                call: call.id,
                user: alice,
                timestamp: Date.now(),
                reason: "reason"
              }
            } as Event);
          });
        });

        events.notify({
          type: eventTypes.CALL_ACTION,
          id: call.id,
          action: {
            action: actionTypes.JOINED,
            call: call.id,
            user: bob,
            timestamp: Date.now()
          }
        } as Event);
      }, (error) => done.fail());
    });

    // FIXME These should be moved to integration tests:
    whenever(isWebRTCSupported())("should allow answering", (done) => {
      getStream((stream) => {
        events.onError((error) => done.fail());

        call.answer(stream).then(() => {
          expect(api.answered).toBe(true);
          done();
        });
      }, (error) => done.fail());
    });

    it("should allow leaving", (done) => {
      events.onError((error) => done.fail());

      call.leave("reason").then(() => {
        expect(api.left).toBe("reason");
        done();
      });
    });

    whenever(isWebRTCSupported())("should allow updating the stream", (done) => {
      getStream((stream) => {
        events.onError((error) => done.fail());

        call.answer(stream).then(() => {
          call.unmute();
          call.mute();
          call.mute();
          call.unmute();
          call.pause();
          call.unpause();
          call.unpause();
          expect(api.updates).toEqual(["mute", "unmute", "pause", "unpause"]);
          done();
        });
      }, (error) => done.fail());
    });

    it("should not send actions when no stream is available", () => {
      call.mute();
      call.unmute();
      call.pause();
      call.unpause();
      expect(api.updates).toEqual([]);
    });

    it("should run a callback on stream updates", (done) => {
      events.onError((error) => done.fail());

      call.onStreamMuted((mute) => {
        expect(mute.user).toBe(alice);

        call.onStreamPaused((pause) => {
          expect(pause.user).toBe(alice);
          done();
        });

        events.notify({
          type: eventTypes.CALL_ACTION,
          id: call.id,
          action: {
            action: actionTypes.VIDEO_PAUSED,
            call: call.id,
            user: alice,
            timestamp: Date.now()
          }
        } as Event);
      });

      events.notify({
        type: eventTypes.CALL_ACTION,
        id: call.id,
        action: {
          action: actionTypes.AUDIO_MUTED,
          call: call.id,
          user: alice,
          timestamp: Date.now()
        }
      } as Event);
    });
  });
});

describe("GroupCall", () => {
  let events;
  let api;
  let call;

  beforeEach(() => {
    events = new EventHandler(log);
    api = new APIMock();
    call = createCall(makeCall(CallType.GROUP), config.chat.rtc, log, events, api) as GroupCall;
  });

  it("should run a callback on invitation", (done) => {
    events.onError((error) => done.fail());

    call.onInvited((msg) => {
      expect(msg.user).toBe(alice);
      expect(msg.invitee).toBe(chad);
      done();
    });

    events.notify({
      type: eventTypes.CALL_ACTION,
      id: call.id,
      action: {
        action: actionTypes.INVITED,
        call: call.id,
        user: alice,
        invitee: chad
      }
    } as Event);
  });

  // FIXME These should be moved to integration tests:
  whenever(isWebRTCSupported())("should allow joining", (done) => {
    getStream((stream) => {
      events.onError((error) => done.fail());

      call.join(stream).then(() => {
        expect(api.joined).toBe(true);
        done();
      });
    }, (error) => done.fail());
  });

  it("should allow inviting users", (done) => {
    events.onError((error) => done.fail());

    call.invite(bob).then(() => {
      expect(api.invited).toBe(bob);
      done();
    });
  });
});

describe("DirectCall, GroupCall", () => {
  const events = new EventHandler(log);
  const api = new APIMock();

  it("should have proper callTYpe filed defined", () => {
    const directCall: Call = createCall(makeCall(CallType.DIRECT), config.chat.rtc, log, events, api);
    const groupCall: Call = createCall(makeCall(CallType.GROUP), config.chat.rtc, log, events, api);
    expect(directCall.callType).toEqual(CallType.DIRECT);
    expect(groupCall.callType).toEqual(CallType.GROUP);
  })
});
