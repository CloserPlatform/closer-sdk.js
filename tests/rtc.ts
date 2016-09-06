import { API } from "../src/api";
import { EventHandler } from "../src/events";
import { config, invalidSDP, log, validSDP, whenever } from "./fixtures";
import { Candidate, Event, ID, SDP } from "../src/protocol";
import { createRTCConnection, createRTCPool } from "../src/rtc";

class APIMock extends API {
    descriptionSent = false;
    onDescription: (callId: ID, peer: ID, sdp: SDP) => void;

    sendDescription(callId: ID, peer: ID, sdp: SDP) {
        this.descriptionSent = true;
        if (this.onDescription) {
            this.onDescription(callId, peer, sdp);
        }
    }

    sendCandidate(callId: ID, peer: ID, candidate: Candidate) {
        // Do nothing.
    }
}

function nop(stream: MediaStream) {
    // Do nothing.
};

function isChrome() {
    return typeof window["chrome"] !== "undefined";
}

function isFirefox() {
    return navigator.userAgent.indexOf("Firefox") != -1;
}

function isWebRTCSupported() {
    return [typeof RTCPeerConnection,
            typeof webkitRTCPeerConnection,
            typeof mozRTCPeerConnection].some((t) => t !== "undefined");
}

function mockRTCPeerConnection() {
    if (typeof RTCPeerConnection !== "undefined") {
        RTCPeerConnection.prototype.addStream = nop;
    } else if (typeof webkitRTCPeerConnection !== "undefined") {
        webkitRTCPeerConnection.prototype.addStream = nop;
    } else if (typeof mozRTCPeerConnection !== "undefined") {
        mozRTCPeerConnection.prototype.addStream = nop;
    }
}

// FIXME Unfuck whenever WebRTC is standarized.
describe("RTCConnection", () => {
    mockRTCPeerConnection();
    let stream: MediaStream = null;

    whenever(!isFirefox() && isWebRTCSupported())("should create SDP offers", (done) => {
        let api = new APIMock(config, log);
        let rtc = createRTCConnection(stream, config.rtc, log, api);
        rtc.onRemoteStream(nop);

        expect(api.descriptionSent).toBe(false);

        rtc.offer("123", "321").then(function(offer) {
            log(offer.sdp);
            expect(api.descriptionSent).toBe(true);
            done();
        }).catch((error) => done.fail());
    });

    whenever(isWebRTCSupported())("should create valid SDP answer", (done) => {
        let sdp: SDP = {
            type: "offer",
            sdp: validSDP
        };
        let api = new APIMock(config, log);
        let rtc = createRTCConnection(stream, config.rtc, log, api);
        rtc.onRemoteStream(nop);

        expect(api.descriptionSent).toBe(false);

        rtc.answer("123", "321", sdp).then(function(offer) {
            expect(api.descriptionSent).toBe(true);
            done();
        }).catch((error) => done.fail());
    });

    whenever(!isChrome() && isWebRTCSupported())("should fail to create SDP answers for invalid offers", (done) => {
        let sdp: SDP = {
            type: "offer",
            sdp: invalidSDP
        };
        let api = new APIMock(config, log);
        let rtc = createRTCConnection(stream, config.rtc, log, api);
        rtc.onRemoteStream(nop);

        expect(api.descriptionSent).toBe(false);

        rtc.answer("123", "321", sdp).then((answer) => done.fail()).catch(function(offer) {
            expect(api.descriptionSent).toBe(false);
            done();
        });
    });
});

describe("RTCPool", () => {
    mockRTCPeerConnection();
    let stream: MediaStream = null;

    whenever(!isFirefox() && isWebRTCSupported())("should create an RTC connection", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let pool = createRTCPool("123", config.rtc, log, events, api);

        api.onDescription = function(id, peer, sdp) {
            expect(api.descriptionSent).toBe(true);
            expect(id).toBe("123");
            expect(peer).toBe("321");
            expect(sdp.type).toBe("offer");
            done();
        };

        events.onError((error) => done.fail());

        pool.addLocalStream(stream);
        pool.create("321");
    });

    whenever(isWebRTCSupported())("should spawn an RTC connection on session description", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let pool = createRTCPool("123", config.rtc, log, events, api);

        api.onDescription = function(id, peer, sdp) {
            expect(api.descriptionSent).toBe(true);
            expect(id).toBe("123");
            expect(peer).toBe("321");
            expect(sdp.type).toBe("answer");
            done();
        };

        events.onError((error) => done.fail());

        pool.addLocalStream(stream);
        pool.onConnection(function(peer, rtc) {
            rtc.onRemoteStream(nop);
            expect(peer).toBe("321");
        });

        events.notify({
            type: "rtc_description",
            id: "123",
            peer: "321",
            description: {
                type: "offer",
                sdp: validSDP
            }
        } as Event);
    });

    whenever(!isFirefox() && isWebRTCSupported())("should not send session description on peer answer", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let pool = createRTCPool("123", config.rtc, log, events, api);

        events.onError((error) => done.fail());

        api.onDescription = function(id, peer, sdp) {
            expect(api.descriptionSent).toBe(true);
            expect(id).toBe("123");
            expect(peer).toBe("321");
            expect(sdp.type).toBe("offer");

            api.descriptionSent = false;

            events.notify({
                type: "rtc_description",
                id: "123",
                peer: "321",
                description: {
                    type: "answer",
                    sdp: validSDP
                }
            } as Event);

            expect(api.descriptionSent).toBe(false);
            done();
        };

        pool.addLocalStream(stream);
        pool.create("321");
    });

    whenever(!isChrome() && isWebRTCSupported())("should error on invalid session description", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let pool = createRTCPool("123", config.rtc, log, events, api);

        events.onError((error) => done());

        api.onDescription = function(id, peer, sdp) {
            expect(api.descriptionSent).toBe(true);
            expect(id).toBe("123");
            expect(peer).toBe("321");
            expect(sdp.type).toBe("offer");

            api.descriptionSent = false;

            events.notify({
                type: "rtc_description",
                id: "123",
                peer: "321",
                description: {
                    type: "answer",
                    sdp: invalidSDP
                }
            } as Event);

            expect(api.descriptionSent).toBe(false);
        };

        pool.addLocalStream(stream);
        pool.create("321");
    });

    whenever(isWebRTCSupported())("should error on invalid RTC signaling", (done) => {
        let events = new EventHandler(log);
        let api = new APIMock(config, log);
        let pool = createRTCPool("123", config.rtc, log, events, api);
        pool.addLocalStream(stream);

        events.onError((error) => done());

        api.onDescription = (id, peer, sdp) => done.fail();

        events.notify({
            type: "rtc_description",
            id: "123",
            peer: "321",
            description: {
                type: "answer",
                sdp: validSDP
            }
        } as Event);
    });
});
