import { API } from "../src/api";
import { createCall, Call } from "../src/call";
import { EventHandler } from "../src/events";
import { config, getStream, isWebRTCSupported, log, validSDP, whenever } from "./fixtures";
import { Call as ProtoCall, Event } from "../src/protocol";
import { createRTCPool, RTCPool } from "../src/rtc";

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

    sendDescription(callId, peer, sdp) {
        // Do nothing.
    }

    sendCandidate(callId, peer, candidate) {
        // Do nothing.
    }
}

function call(direct = false) {
    return {
        id: "123",
        users: ["321"],
        direct: direct
    } as ProtoCall;
}

["DirectCall", "Call"].forEach((d) => {
    describe(d, () => {
        whenever(isWebRTCSupported())("should allow joining", (done) => {
            getStream((stream) => {
                let events = new EventHandler(log);
                let api = new APIMock(config, log);
                let c = createCall(call(d === "DirectCall"), config.rtc, log, events, api);

                events.onError((error) => done.fail());

                c.join(stream).then(() => {
                    expect(api.joined).toBe(true);
                    done();
                });
            }, (error) => done.fail());
        });

        it("should allow leaving", (done) => {
            let events = new EventHandler(log);
            let api = new APIMock(config, log);
            let c = createCall(call(d === "DirectCall"), config.rtc, log, events, api);

            events.onError((error) => done.fail());

            c.leave("reason").then(() => {
                expect(api.left).toBe("reason");
                done();
            });
        });

        it("should allow rejecting", (done) => {
            let events = new EventHandler(log);
            let api = new APIMock(config, log);
            let c = createCall(call(d === "DirectCall"), config.rtc, log, events, api);

            events.onError((error) => done.fail());

            c.reject().then(() => {
                expect(api.left).toBe("rejected");
                done();
            });
        });

        whenever(isWebRTCSupported())("should run a callback on join", (done) => {
            getStream((stream) => {
                let events = new EventHandler(log);
                let api = new APIMock(config, log);
                let c = createCall(call(d === "DirectCall"), config.rtc, log, events, api);
                c.addLocalStream(stream);

                events.onError((error) => done.fail());

                c.onJoined((msg) => {
                    expect(msg.user).toBe("987");
                    done();
                });

                events.notify({
                    type: "call_joined",
                    id: "123",
                    user: "987"
                } as Event);
            }, (error) => done.fail());
        });

        it("should run a callback on leave", (done) => {
            let events = new EventHandler(log);
            let api = new APIMock(config, log);
            let c = createCall(call(d === "DirectCall"), config.rtc, log, events, api);

            events.onError((error) => done.fail());

            c.onLeft((msg) => {
                expect(msg.user).toBe("321");
                done();
            });

            events.notify({
                type: "call_left",
                id: "123",
                user: "321"
            } as Event);
        });

        whenever(isWebRTCSupported())("should maintain the user list", (done) => {
            getStream((stream) => {
                let events = new EventHandler(log);
                let api = new APIMock(config, log);
                let c = createCall(call(d === "DirectCall"), config.rtc, log, events, api);
                c.addLocalStream(stream);

                events.onError((error) => done.fail());

                c.onJoined((msg) => {
                    expect(msg.user).toBe("456");

                    c.getUsers().then((users) => {
                        expect(users).toContain("456");
                        expect(users).toContain("321");

                        c.onLeft((msg) => {
                            expect(msg.user).toBe("321");

                            c.getUsers().then((users) => {
                                expect(users).toContain("456");
                                expect(users).not.toContain("321");
                                done();
                            });
                        });

                        events.notify({
                            type: "call_left",
                            id: "123",
                            user: "321"
                        } as Event);
                    });
                });

                events.notify({
                    type: "call_joined",
                    id: "123",
                    user: "456"
                } as Event);
            }, (error) => done.fail());
        });
    });
});

describe("Call", () => {
    it("should allow inviting users", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let c = createCall(call(), config.rtc, log, events, api) as Call;

        events.onError((error) => done.fail());

        c.invite("456").then(() => {
            expect(api.invited).toBe("456");
            done();
        });
    });

    it("should run a callback on invitation", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let c = createCall(call(), config.rtc, log, events, api) as Call;

        events.onError((error) => done.fail());

        c.onInvited((msg) => {
            expect(msg.sender).toBe("321");
            expect(msg.user).toBe("987");
            done();
        });

        events.notify({
            type: "call_invited",
            id: "123",
            sender: "321",
            user: "987"
        } as Event);
    });
});
