import { API } from "./api";
import { EventHandler } from "./events";
import { config, getStream, invalidSDP, isChrome, isWebRTCSupported, log, validSDP, whenever } from "./fixtures.spec";
import { Candidate, Event, ID, SDP } from "./protocol";
import { createRTCConnection, createRTCPool } from "./rtc";

const callId = "123";
const peerId = "321";

function descr(sdp): Event {
    return {
        type: "rtc_description",
        id: callId,
        peer: peerId,
        description: sdp
    } as Event;
}

class APIMock extends API {
    descriptionSent = false;
    onDescription: (call: ID, peer: ID, sdp: SDP) => void;

    sendDescription(call: ID, peer: ID, sdp: SDP) {
        this.descriptionSent = true;
        if (this.onDescription) {
            this.onDescription(call, peer, sdp);
        }
    }

    sendCandidate(call: ID, peer: ID, candidate: Candidate) {
        // Do nothing.
    }
}

function nop(stream: MediaStream) {
    // Do nothing.
};

// FIXME Unfuck whenever WebRTC is standarized.
describe("RTCConnection", () => {
    let api;

    beforeEach(() => {
        api = new APIMock(config, log);
    });

    whenever(isWebRTCSupported())("should create SDP offers", (done) => {
        getStream((stream) => {
            let rtc = createRTCConnection(stream, config.rtc, log, api);
            rtc.onRemoteStream(nop);

            expect(api.descriptionSent).toBe(false);

            rtc.offer(callId, peerId).then(function(offer) {
                expect(api.descriptionSent).toBe(true);
                done();
            }).catch((error) => done.fail());
        }, (error) => done.fail());
    });

    whenever(isWebRTCSupported())("should create valid SDP answer", (done) => {
        getStream((stream) => {
            let sdp: SDP = {
                type: "offer",
                sdp: validSDP
            };
            let rtc = createRTCConnection(stream, config.rtc, log, api);
            rtc.onRemoteStream(nop);

            expect(api.descriptionSent).toBe(false);

            rtc.answer(callId, peerId, sdp).then(function(offer) {
                expect(api.descriptionSent).toBe(true);
                done();
            }).catch((error) => done.fail());
        }, (error) => done.fail());
    });

    whenever(!isChrome() && isWebRTCSupported())("should fail to create SDP answers for invalid offers", (done) => {
        getStream((stream) => {
            let sdp: SDP = {
                type: "offer",
                sdp: invalidSDP
            };
            let rtc = createRTCConnection(stream, config.rtc, log, api);
            rtc.onRemoteStream(nop);

            expect(api.descriptionSent).toBe(false);

            rtc.answer(callId, peerId, sdp).then((answer) => done.fail()).catch(function(offer) {
                expect(api.descriptionSent).toBe(false);
                done();
            });
        }, (error) => done.fail());
    });
});

describe("RTCPool", () => {
    let events;
    let api;
    let pool;

    beforeEach(() => {
        events = new EventHandler(log);
        api = new APIMock(config, log);
        pool = createRTCPool(callId, config.rtc, log, events, api);
    });

    whenever(isWebRTCSupported())("should create an RTC connection", (done) => {
        getStream((stream) => {
            api.onDescription = function(id, peer, sdp) {
                expect(api.descriptionSent).toBe(true);
                expect(id).toBe(callId);
                expect(peer).toBe(peerId);
                expect(sdp.type).toBe("offer");
                done();
            };

            events.onError((error) => done.fail());

            pool.addLocalStream(stream);
            pool.create(peerId).onRemoteStream(nop);
        }, (error) => done.fail());
    });

    whenever(isWebRTCSupported())("should spawn an RTC connection on session description", (done) => {
        getStream((stream) => {
            api.onDescription = function(id, peer, sdp) {
                expect(api.descriptionSent).toBe(true);
                expect(id).toBe(callId);
                expect(peer).toBe(peerId);
                expect(sdp.type).toBe("answer");
                done();
            };

            events.onError((error) => done.fail());

            pool.addLocalStream(stream);
            pool.onConnection(function(peer, rtc) {
                rtc.onRemoteStream(nop);
                expect(peer).toBe(peerId);
            });

            events.notify(descr({
                type: "offer",
                sdp: validSDP
            }));
        }, (error) => done.fail());
    });

    whenever(!isChrome() && isWebRTCSupported())("should error on invalid session description", (done) => {
        getStream((stream) => {
            pool.addLocalStream(stream);
            events.onError((error) => done());

            events.notify(descr({
                type: "offer",
                sdp: invalidSDP
            }));

            expect(api.descriptionSent).toBe(false);
        }, (error) => done.fail());
    });

    whenever(isWebRTCSupported())("should not send session description on peer answer", (done) => {
        getStream((stream) => {
            events.onError((error) => done.fail());

            api.onDescription = function(id, peer, sdp) {
                expect(api.descriptionSent).toBe(true);
                expect(id).toBe(callId);
                expect(peer).toBe(peerId);
                expect(sdp.type).toBe("offer");

                api.descriptionSent = false;

                events.notify(descr({
                    type: "answer",
                    sdp: validSDP
                }));

                expect(api.descriptionSent).toBe(false);
                done();
            };

            pool.addLocalStream(stream);
            pool.create(peerId).onRemoteStream(nop);
        }, (error) => done.fail());
    });

    whenever(isWebRTCSupported())("should error on invalid RTC signaling", (done) => {
        getStream((stream) => {
            pool.addLocalStream(stream);
            events.onError((error) => done());
            api.onDescription = (id, peer, sdp) => done.fail();

            events.notify(descr({
                type: "answer",
                sdp: validSDP
            }));
        }, (error) => done.fail());
    });
});
