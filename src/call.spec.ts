import { API } from "./api";
import { Call, createCall } from "./call";
import { EventHandler } from "./events";
import { config, getStream, isWebRTCSupported, log, whenever } from "./fixtures.spec";
import { Call as ProtoCall, Event } from "./protocol";

const callId = "123";
const alice = "321";
const bob = "456";
const chad = "987";

class APIMock extends API {
    joined = false;
    left: string;
    invited: string;

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
}

function makeCall(direct = false) {
    return {
        id: callId,
        created: 123,
        users: [alice],
        direct
    } as ProtoCall;
}

["DirectCall", "Call"].forEach((d) => {
    describe(d, () => {
        let events;
        let api;
        let call;

        beforeEach(() => {
            events = new EventHandler(log);
            api = new APIMock(config, log);
            call = createCall(makeCall(d === "DirectCall"), config.chat.rtc, log, events, api);
        });

        it("should allow rejecting", (done) => {
            events.onError((error) => done.fail());

            call.reject().then(() => {
                expect(api.left).toBe("rejected");
                done();
            });
        });

        whenever(isWebRTCSupported())("should run a callback on join", (done) => {
            getStream((stream) => {
                call.addLocalStream(stream);

                events.onError((error) => done.fail());

                call.onJoined((msg) => {
                    expect(msg.user).toBe(chad);
                    done();
                });

                events.notify({
                    type: "call_joined",
                    id: call.id,
                    user: chad
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
                type: "call_left",
                id: call.id,
                user: alice
            } as Event);
        });

        whenever(isWebRTCSupported())("should maintain the user list", (done) => {
            getStream((stream) => {
                call.addLocalStream(stream);

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
                            type: "call_left",
                            id: call.id,
                            user: alice
                        } as Event);
                    });
                });

                events.notify({
                    type: "call_joined",
                    id: call.id,
                    user: bob
                } as Event);
            }, (error) => done.fail());
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

        it("should allow leaving", (done) => {
            events.onError((error) => done.fail());

            call.leave("reason").then(() => {
                expect(api.left).toBe("reason");
                done();
            });
        });
    });
});

describe("Call", () => {
    let events;
    let api;
    let call;

    beforeEach(() => {
        events = new EventHandler(log);
        api = new APIMock(config, log);
        call = createCall(makeCall(), config.chat.rtc, log, events, api) as Call;
    });

    it("should run a callback on invitation", (done) => {
        events.onError((error) => done.fail());

        call.onInvited((msg) => {
            expect(msg.sender).toBe(alice);
            expect(msg.user).toBe(chad);
            done();
        });

        events.notify({
            type: "call_invited",
            id: call.id,
            sender: alice,
            user: chad
        } as Event);
    });

    // FIXME These should be moved to integration tests:
    it("should allow inviting users", (done) => {
        events.onError((error) => done.fail());

        call.invite(bob).then(() => {
            expect(api.invited).toBe(bob);
            done();
        });
    });
});
