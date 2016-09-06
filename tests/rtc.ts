import { API } from "../src/api";
import { config, invalidSDP, log, validSDP, whenever } from "./fixtures";
import { SDP } from "../src/protocol";
import { createRTCConnection, RTCConnection } from "../src/rtc";

class APIMock extends API {
    descriptionSent = false;

    sendDescription(callId, peer, sdp) {
        this.descriptionSent = true;
    }

    sendCandidate(callId, peer, candidate) {
        // Do nothing.
    }
}

function nop(stream) {
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
