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
    if (typeof error.cause !== "undefined") {
      log("Cause: " + error.cause);
    }
    done.fail();
  }
}

class APIMock extends ArtichokeAPI {
  descriptionSent = false;
  onDescription: (call: ID, peer: ID, sdp: wireEvents.SDP) => void;
  onCandidate: (call: ID, peer: ID, candidate: wireEvents.Candidate) => void;

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
    if (this.onCandidate) {
      this.onCandidate(call, peer, candidate);
    }
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

  function testRenegotiation(peerA, peerB, caller, callee, calleeId, done) {
    // 0. Initial setup...
    getStream((streamA) => {
      getStream((streamB) => {
        caller.addLocalStream(streamA);
        callee.addLocalStream(streamB);

        // 4. Peers exchange candidates.
        let candidates = [];
        api.onCandidate = (call, peer, candidate) => {
          candidates.push({ peer, candidate });
        };

        function exchange() {
          Promise.all(candidates.map((c) => {
            if (c.peer === peerAId) return peerA.addCandidate(c.candidate);
            else return peerB.addCandidate(c.candidate);
          })).then(() => {
            // 5. Innitiator triggers a renegotiation.
            getStream((newStream) => {
              caller.addLocalStream(newStream)
            }, logError(done), {
              audio: true
            });
          }).catch(logError(done));
        }

        let doneA = false;
        let doneB = false;

        peerA.onICEDone(() => {
          doneA = true;
          if (doneA && doneB) exchange();
        });

        peerB.onICEDone(() => {
          doneB = true;
          if (doneA && doneB) exchange();
        });

        // 1. Peer A offers a connection.
        peerA.offer().then((offer) => {
          // 2. Peer B answers it.
          peerB.addOffer(offer).then((answer) => {
            // 3. Peer A establishes a connection.
            peerA.addAnswer(answer).then(() => {
              api.descriptionSent = false;

              // 6. Innitiator sends an offer to the peer.
              api.onDescription = (id, peer, description) => {
                expect(api.descriptionSent).toBe(true);
                expect(description.type).toBe("offer");
                expect(peer).toBe(calleeId)
                done();
              };
            }).catch(logError(done));
          }).catch(logError(done));
        }).catch(logError(done));
      }, logError(done));
    }, logError(done), {
      video: true
    });
  }

  whenever(isWebRTCSupported())("should renegotiate SDP answers", (done) => {
    const peerB = createRTCConnection(callId, peerAId, config.chat.rtc, log, events, api);
    testRenegotiation(peerA, peerB, peerB, peerA, peerAId, done);
  });

  whenever(isWebRTCSupported())("should renegotiate SDP offers", (done) => {
    const peerB = createRTCConnection(callId, peerAId, config.chat.rtc, log, events, api);
    testRenegotiation(peerA, peerB, peerA, peerB, peerBId, done);
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
    const peer = createRTCConnection(callId, peerAId, config.chat.rtc, log, events, api);
    getStream((streamPeer) => {
      getStream((streamPool) => {
      peer.addLocalStream(streamPeer);

        peer.offer().then((offer) => {

          api.onDescription = (id, peer, sdp) => {
            expect(api.descriptionSent).toBe(true);
            expect(id).toBe(callId);
            expect(peer).toBe(peerAId);
            expect(sdp.type).toBe("answer");
            done();
          };

          events.onError(logError(done));

          pool.addLocalStream(streamPool);
          pool.onConnection((peer, rtc) => {
            expect(peer).toBe(peerAId);
          });

          events.notify(descr(offer));
      });
      }, logError(done));
    }, logError(done));
  });

  whenever(!isChrome() && isWebRTCSupported())("should error on invalid session description", (done) => {
    getStream((stream) => {
      pool.addLocalStream(stream);
      events.onError((error) => done());
      api.onDescription = (id, peer, sdp) => done.fail();

      events.notify(descr({
        type: "offer",
        sdp: invalidSDP
      }));
    }, logError(done));
  });

  whenever(isWebRTCSupported())("should error on invalid RTC signaling", (done) => {
    getStream((stream) => {
      pool.addLocalStream(stream);
      events.onError((error) => done());
      api.onDescription = (id, peer, sdp) => done.fail();

      events.notify(descr({
        type: "answer",
        sdp: invalidSDP
      }));
    }, logError(done));
  });

  whenever(isWebRTCSupported())("should not send session description on peer answer", (done) => {
    const peer = createRTCConnection(callId, peerBId, config.chat.rtc, log, events, api);
    getStream((streamPeer) => {
      getStream((streamPool) => {
        peer.addLocalStream(streamPeer);
        pool.addLocalStream(streamPool);

        events.onError(logError(done));

        api.onDescription = (id, peerId, sdp) => {
          expect(api.descriptionSent).toBe(true);
          expect(id).toBe(callId);
          expect(peerId).toBe(peerAId);
          expect(sdp.type).toBe("offer");

          api.onDescription = (id, peerId, sdp) => {
            expect(api.descriptionSent).toBe(true);
            expect(id).toBe(callId);
            expect(peerId).toBe(peerBId);
            expect(sdp.type).toBe("answer");
          };

          api.descriptionSent = false;

          peer.addOffer(sdp).then((answer) => {
            // Should not answer the answer.
            api.onDescription = (id, peerId, sdp) => done.fail();
            events.notify(descr(answer));
            done();
          }).catch(logError(done));
        };

        pool.create(peerAId);
      }, logError(done));
    }, logError(done));
  });
});
