import { ArtichokeAPI } from "./api";
import { EventHandler } from "./events";
import {
  apiKey,
  config,
  getStream,
  invalidSDP,
  isChrome,
  isWebRTCSupported,
  log,
  validSDP,
  whenever
} from "./fixtures.spec";
import { Event } from "./protocol/events";
import { ID } from "./protocol/protocol";
import * as wireEvents from "./protocol/wire-events";
import { eventTypes } from "./protocol/wire-events";
import { createRTCConnection, createRTCPool } from "./rtc";

const callId = "123";
const peerAId = "321";
const peerBId = "333";

function descr(sdp): Event {
  return {
    type: eventTypes.RTC_DESCRIPTION,
    id: callId,
    peer: peerAId,
    description: sdp
  } as Event;
}

function logError(done) {
  return function (error) {
    log("Got an error: " + error + " (" + JSON.stringify(error) + ")");
    done.fail();
  }
}

class APIMock extends ArtichokeAPI {
  descriptionSent = false;
  onDescription: (call: ID, peer: ID, sdp: wireEvents.SDP) => void;

  constructor() {
    super(apiKey, config.chat, log);
  }

  sendDescription(call: ID, peer: ID, sdp: wireEvents.SDP) {
    this.descriptionSent = true;
    if (this.onDescription) {
      this.onDescription(call, peer, sdp);
    }
  }

  sendCandidate(call: ID, peer: ID, candidate: wireEvents.Candidate) {
    // Do nothing.
  }
}

// FIXME Unfuck whenever WebRTC is standarized.
describe("RTCConnection", () => {
  let events;
  let api;
  let peerA;

  beforeEach(() => {
    api = new APIMock();
    events = new EventHandler(log);
    peerA = createRTCConnection(callId, peerBId, config.chat.rtc, log, events, api);
  });

  whenever(isWebRTCSupported())("should create valid SDP offers", (done) => {
    getStream((stream) => {
      peerA.addLocalStream(stream);

      expect(api.descriptionSent).toBe(false);

      peerA.offer().then((offer) => {
        expect(api.descriptionSent).toBe(true);
        done();
      }).catch(logError(done));
    }, logError(done));
  });

  whenever(isWebRTCSupported())("should create valid SDP answers", (done) => {
    const peerB = createRTCConnection(callId, peerAId, config.chat.rtc, log, events, api);
    getStream((streamA) => {
      peerA.addLocalStream(streamA);
      // Peer A offers a connection.
      peerA.offer().then((offer) => {
        getStream((streamB) => {
          peerB.addLocalStream(streamB);

          api.descriptionSent = false;
          // Peer B accepts & answers it.
          peerB.setRemoteDescription(offer).then((sdp) => {
            peerB.answer().then((answer) => {
              expect(api.descriptionSent).toBe(true);
              done();
            }).catch(logError(done));
          }).catch(logError(done));
        }, logError(done));
      }).catch(logError(done));
    }, logError(done));
  });

  whenever(isWebRTCSupported())("should renegotiate SDP offers", (done) => {
    const peerB = createRTCConnection(callId, peerAId, config.chat.rtc, log, events, api);

    getStream((streamA) => {
      peerA.addLocalStream(streamA);
      // Peer A offers a connection.
      peerA.offer().then((offer) => {
        getStream((streamB) => {
          peerB.addLocalStream(streamB);
          // Peer B answers it.
          peerB.onOffer(offer).then((answer) => {
            // Peer A establishes a connection.
            peerA.onAnswer(answer).then(() => {
              api.descriptionSent = false;

              api.onDescription = (id, peer, description) => {
                expect(api.descriptionSent).toBe(true);
                expect(description.type).toBe("offer");
                expect(peer).toBe(peerBId); // Peer A sends an offer to Peer B.
                done();
              };

              // Peer A triggers a renegotiation.
              getStream((newStream) => {
                peerA.addLocalStream(newStream);
              }, logError(done), {
                audio: true
              });
            }).catch(logError(done));
          }).catch(logError(done));
        }, logError(done));
      }).catch(logError(done));
    }, logError(done), {
      video: true
    });
  });

  whenever(isWebRTCSupported())("should renegotiate SDP answers", (done) => {
    const peerB = createRTCConnection(callId, peerAId, config.chat.rtc, log, events, api);

    getStream((streamA) => {
      peerA.addLocalStream(streamA);
      // Peer A offers a connection.
      peerA.offer().then((offer) => {
        getStream((streamB) => {
          peerB.addLocalStream(streamB);
          // Peer B answers it.
          peerB.onOffer(offer).then((answer) => {
            // Peer A establishes a connection.
            peerA.onAnswer(answer).then(() => {
              api.descriptionSent = false;

              api.onDescription = (id, peer, description) => {
                expect(api.descriptionSent).toBe(true);
                expect(description.type).toBe("offer");
                expect(peer).toBe(peerAId); // Peer B sends an offer to Peer A.
                done();
              };

              // Peer B triggers a renegotiation.
              getStream((newStream) => {
                peerB.addLocalStream(newStream);
              }, logError(done), {
                audio: true
              });
            }).catch(logError(done));
          }).catch(logError(done));
        }, logError(done));
      }).catch(logError(done));
    }, logError(done), {
      video: true
    });
  });

  whenever(!isChrome() && isWebRTCSupported())("should fail to create SDP answers for invalid offers", (done) => {
    getStream((stream) => {
      let sdp: wireEvents.SDP = {
        type: "offer",
        sdp: invalidSDP
      };
      peerA.addLocalStream(stream);

      expect(api.descriptionSent).toBe(false);

      peerA.answer().then((answer) => done.fail()).catch((error) => {
        expect(api.descriptionSent).toBe(false);
        done();
      });
    }, logError(done));
  });
});

describe("RTCPool", () => {
  let events;
  let api;
  let pool;

  beforeEach(() => {
    events = new EventHandler(log);
    api = new APIMock();
    pool = createRTCPool(callId, config.chat.rtc, log, events, api);
  });

  whenever(isWebRTCSupported())("should create an RTC connection", (done) => {
    getStream((stream) => {
      api.onDescription = function(id, peer, sdp) {
        expect(api.descriptionSent).toBe(true);
        expect(id).toBe(callId);
        expect(peer).toBe(peerAId);
        expect(sdp.type).toBe("offer");
        done();
      };

      events.onError(logError(done));

      pool.addLocalStream(stream);
      pool.create(peerAId);
    }, logError(done));
  });

  whenever(isWebRTCSupported())("should spawn an RTC connection on session description", (done) => {
    getStream((stream) => {
      api.onDescription = function(id, peer, sdp) {
        expect(api.descriptionSent).toBe(true);
        expect(id).toBe(callId);
        expect(peer).toBe(peerAId);
        expect(sdp.type).toBe("answer");
        done();
      };

      events.onError(logError(done));

      pool.addLocalStream(stream);
      pool.onConnection(function(peer, rtc) {
        expect(peer).toBe(peerAId);
      });

      events.notify(descr({
        type: "offer",
        sdp: validSDP
      }));
    }, logError(done));
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
    }, logError(done));
  });

  // FIXME On chrome this test causes the next one to fail. Shit is bonkers. Send help.
  whenever(!isChrome() && isWebRTCSupported())("should not send session description on peer answer", (done) => {
    getStream((stream) => {
      events.onError(logError(done));

      api.onDescription = function(id, peer, sdp) {
        expect(api.descriptionSent).toBe(true);
        expect(id).toBe(callId);
        expect(peer).toBe(peerAId);
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
      pool.create(peerAId);
    }, logError(done));
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
    }, logError(done));
  });
});
