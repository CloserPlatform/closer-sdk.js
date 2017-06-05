import { ArtichokeAPI } from "./api";
import { EventHandler } from "./events";
import {
  apiKey,
  config,
  getStream,
  isWebRTCSupported,
  log,
  sleep,
  whenever
} from "./fixtures.spec";
import { Event } from "./protocol/events";
import { ID } from "./protocol/protocol";
import * as wireEvents from "./protocol/wire-events";
import { eventTypes } from "./protocol/wire-events";
import { createRTCConnection, createRTCPool, RTCConnection, RTCPool } from "./rtc";

const invalidSDP = "this is not a valid SDP";

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

function addLocalStream(pool: RTCPool|RTCConnection, stream: MediaStream) {
  stream.getTracks().forEach((t) => pool.addTrack(t, stream));
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
      addLocalStream(peerA, stream);

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
      addLocalStream(peerA, streamA);
      // Peer A offers a connection.
      peerA.offer().then((offer) => {
        getStream((streamB) => {
          addLocalStream(peerB, streamB);

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

  whenever(isWebRTCSupported())("should fail to create SDP answers for invalid offers", (done) => {
    getStream((stream) => {
      let sdp: wireEvents.SDP = {
        type: "offer",
        sdp: invalidSDP
      };
      addLocalStream(peerA, stream);

      expect(api.descriptionSent).toBe(false);

      peerA.addOffer(sdp).then((answer) => done.fail()).catch((error) => {
        expect(api.descriptionSent).toBe(false);
        done();
      });
    }, logError(done));
  });

  function testRenegotiation(peerA, peerB, caller, callee, calleeId, done) {
    // 0. Initial setup...
    getStream((streamA) => {
      log("Got stream A.");
      getStream((streamB) => {
        log("Got stream B.");
        addLocalStream(caller, streamA);
        addLocalStream(callee, streamB);

        // 4. Peers exchange candidates.
        let candidates = [];
        api.onCandidate = (call, peer, candidate) => {
          candidates.push({ peer, candidate });
        };

        function exchange() {
          log("Exchanging candidates.");
          Promise.all(candidates.map((c) => {
            if (c.peer === peerAId) return peerA.addCandidate(c.candidate);
            else return peerB.addCandidate(c.candidate);
          })).then(() => {
            peerA.onICEDone(() => {
              // Not to exchange any candidates after the renegotiation.
            });

            peerB.onICEDone(() => {
              // Not to exchange any candidates after the renegotiation.
            });

            // 5. Innitiator triggers a renegotiation.
            getStream((newStream) => {
              log("Got new stream.");

              // 6. Innitiator sends an offer to the peer.
              api.onDescription = (id, peer, description) => {
                expect(description.type).toBe("offer");
                expect(peer).toBe(calleeId)
                log("Renegotiation successful.");
                done();
              };

              // FIXME This sleep is required so that the connection has the time to
              // FIXME transition into an established state.
              sleep(100).then(() => {
                log("Triggering renegotiation.");
                addLocalStream(caller, newStream);
              });
            }, logError(done));
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
          log("Sent offer.");
          // 2. Peer B answers it.
          peerB.addOffer(offer).then((answer) => {
            log("Received offer & sent answer.");
            // 3. Peer A establishes a connection.
            peerA.addAnswer(answer).then(() => {
              log("Received answer.");
            }).catch(logError(done));
          }).catch(logError(done));
        }).catch(logError(done));
      }, logError(done));
    }, logError(done));
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

      addLocalStream(pool, stream);
      pool.create(peerAId);
    }, logError(done));
  });

  whenever(isWebRTCSupported())("should spawn an RTC connection on session description", (done) => {
    const peer = createRTCConnection(callId, peerAId, config.chat.rtc, log, events, api);
    getStream((streamPeer) => {
      getStream((streamPool) => {
        addLocalStream(peer, streamPeer);

        peer.offer().then((offer) => {

          api.onDescription = (id, peer, sdp) => {
            expect(api.descriptionSent).toBe(true);
            expect(id).toBe(callId);
            expect(peer).toBe(peerAId);
            expect(sdp.type).toBe("answer");
            done();
          };

          events.onError(logError(done));

          addLocalStream(pool, streamPool);
          pool.onRemoteStream((peer, stream) => {
            expect(peer).toBe(peerAId);
          });

          events.notify(descr(offer));
      });
      }, logError(done));
    }, logError(done));
  });

  whenever(isWebRTCSupported())("should error on invalid session description", (done) => {
    getStream((stream) => {
      addLocalStream(pool, stream);
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
      addLocalStream(pool, stream);
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
        addLocalStream(peer, streamPeer);
        addLocalStream(pool, streamPool);

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
