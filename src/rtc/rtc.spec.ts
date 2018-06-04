// tslint:disable:max-file-line-count
import {
  apiKeyMock,
  config,
  getStream,
  isWebRTCSupported,
  log,
  sessionIdMock,
  sleep,
  whenever
} from '../test-utils';
import { decoder } from '../protocol/events/domain-event';
import { errorEvents } from '../protocol/events/error-events';
import { rtcEvents } from '../protocol/events/rtc-events';
import { ID } from '../protocol/protocol';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { RTCConnection } from './rtc-connection';
import { RTCPool } from './rtc-pool';
import { EventHandler } from '../events/event-handler';
import { createRTCConnection } from './create-rtc-connection';
import { createRTCPool } from './create-rtc-pool';

// FIXME
// tslint:disable:no-any

const invalidSDP = 'this is not a valid SDP';

const callIdMock = '123';
const peerAId = '321';
const peerBId = '333';

const descr = (sdp: any): rtcEvents.DescriptionSent =>
  new rtcEvents.DescriptionSent(callIdMock, peerAId, sdp);

const logError = (done: any): (err: any) => void =>
  (error): void => {
    log.error('Got an error: ' + error + ' (' + JSON.stringify(error) + ')');
    if (typeof error.cause !== 'undefined') {
      log.error('Cause: ' + error.cause);
    }
    done.fail();
  };

const addLocalStream = (pool: RTCPool | RTCConnection, stream: MediaStream): void =>
  stream.getTracks().forEach((t) => pool.addTrack(t, stream));

class APIMock extends ArtichokeAPI {
  public descriptionSent = false;
  public onDescription: (callId: ID, peer: ID, sdp: RTCSessionDescriptionInit) => void;
  public onCandidate: (callId: ID, peer: ID, candidate: RTCIceCandidate) => void;

  constructor() {
    super(sessionIdMock, apiKeyMock, config.chat, log);
  }

  public sendDescription(callId: ID, sessionId: ID, description: RTCSessionDescriptionInit): Promise<void> {
    this.descriptionSent = true;
    if (this.onDescription) {
      this.onDescription(callId, sessionId, description);
    }

    return Promise.resolve();
  }

  public sendCandidate(call: ID, peer: ID, candidate: RTCIceCandidate): Promise<void> {
    if (this.onCandidate) {
      this.onCandidate(call, peer, candidate);
    }

    return Promise.resolve();
  }
}

describe('RTCConnection', () => {
  let events: any;
  let api: any;
  let peerAtest: any;

  beforeEach(() => {
    api = new APIMock();
    events = new EventHandler(log, decoder);
    peerAtest = createRTCConnection(callIdMock, peerBId, config.chat.rtc, log, events, api);
  });

  whenever(isWebRTCSupported())('should create valid SDP offers', (done) => {
    getStream((stream) => {
      addLocalStream(peerAtest, stream);

      expect(api.descriptionSent).toBe(false);

      peerAtest.offer().then((offer: any) => {
        expect(api.descriptionSent).toBe(true);
        done();
      }).catch(logError(done));
    }, logError(done));
  });

  whenever(isWebRTCSupported())('should create valid SDP answers', (done) => {
    const peerB = createRTCConnection(callIdMock, peerAId, config.chat.rtc, log, events, api);

    getStream((streamA) => {
      addLocalStream(peerAtest, streamA);
      // Peer A offers a connection.
      peerAtest.offer().then((offer: any) => {
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

  whenever(isWebRTCSupported())('should fail to create SDP answers for invalid offers', (done) => {
    getStream((stream) => {
      const sdp: RTCSessionDescriptionInit = {
        type: 'offer',
        sdp: invalidSDP
      };
      addLocalStream(peerAtest, stream);

      expect(api.descriptionSent).toBe(false);

      peerAtest.addOffer(sdp).then((answer: any) => done.fail()).catch((error: any) => {
        expect(api.descriptionSent).toBe(false);
        done();
      });
    }, logError(done));
  });

  const testRenegotiation = (peerA: any, peerB: any, trigger: any, calleeId: any, done: any): void => {
    // 0. Initial setup...
    getStream((streamA) => {
      log.info('Got stream A.');
      getStream((streamB) => {
        log.info('Got stream B.');
        addLocalStream(peerA, streamA);
        addLocalStream(peerB, streamB);

        // 4. Peers exchange candidates.
        // FIXME
        // tslint:disable-next-line:no-any
        const candidates: Array<any> = [];
        api.onCandidate = (call: any, peer: any, candidate: any): void => {
          candidates.push({peer, candidate});
        };

        const exchange = (): void => {
          log.info('Exchanging candidates.');
          Promise.all(candidates.map((c) => {
            if (c.peer === peerAId) {
              return peerA.addCandidate(c.candidate);
            }
            else {
              return peerB.addCandidate(c.candidate);
            }
          })).then(() => {
            peerA.onICEDone(() => {
              // Not to exchange any candidates after the renegotiation.
            });

            peerB.onICEDone(() => {
              // Not to exchange any candidates after the renegotiation.
            });

            // 6. Innitiator sends an offer to the peer.
            api.onDescription = (id: any, peer: any, description: any): void => {
              expect(description.type).toBe('offer');
              expect(peer).toBe(calleeId);
              log.info('Renegotiation successful.');
              done();
            };

            // 5. Innitiator triggers a renegotiation.
            // FIXME This sleep is required so that the connection has the time to
            // FIXME transition into an established state.
            sleep(100).then(trigger);
          }).catch(logError(done));
        };

        let doneA = false;
        let doneB = false;

        peerA.onICEDone(() => {
          doneA = true;
          if (doneA && doneB) {
            exchange();
          }
        });

        peerB.onICEDone(() => {
          doneB = true;
          if (doneA && doneB) {
            exchange();
          }
        });

        // 1. Peer A offers a connection.
        peerA.offer().then((offer: any) => {
          log.info('Sent offer.');
          // 2. Peer B answers it.
          peerB.addOffer(offer).then((answer: any) => {
            log.info('Received offer & sent answer.');
            // 3. Peer A establishes a connection.
            peerA.addAnswer(answer).then(() => {
              log.info('Received answer.');
            }).catch(logError(done));
          }).catch(logError(done));
        }).catch(logError(done));
      }, logError(done));
    }, logError(done));
  };

  whenever(isWebRTCSupported())('should renegotiate SDP on caller side', (done) => {
    const peerB = createRTCConnection(callIdMock, peerAId, config.chat.rtc, log, events, api);
    testRenegotiation(peerAtest, peerB, () => {
      getStream((newStream) => {
        log.info('Got new stream. Triggering renegotiation...');
        addLocalStream(peerAtest, newStream);
      }, logError(done));
    }, peerBId, done);
  });

  whenever(isWebRTCSupported())('should renegotiate SDP on calee side', (done) => {
    const peerB = createRTCConnection(callIdMock, peerAId, config.chat.rtc, log, events, api);
    testRenegotiation(peerAtest, peerB, () => {
      getStream((newStream) => {
        log.info('Got new stream. Triggering renegotiation...');
        addLocalStream(peerB, newStream);
      }, logError(done));
    }, peerAId, done);
  });

  whenever(isWebRTCSupported())('should renegotiate on addTrack', (done) => {
    const peerB = createRTCConnection(callIdMock, peerAId, config.chat.rtc, log, events, api);
    testRenegotiation(peerAtest, peerB, () => {
      getStream((newStream) => {
        log.info('Got new stream. Adding a stream track...');
        peerAtest.addTrack(newStream.getTracks()[0], newStream);
      }, logError(done));
    }, peerBId, done);
  });

  whenever(isWebRTCSupported())('should renegotiate on removeTrack', (done) => {
    const peerB = createRTCConnection(callIdMock, peerAId, config.chat.rtc, log, events, api);
    testRenegotiation(peerAtest, peerB, () => {
      log.info('Removing a stream track...');
      // FIXME
      // tslint:disable-next-line:no-any
      peerAtest.removeTrack((peerAtest as any).conn.getLocalStreams()[0].getTracks()[0]);
    }, peerBId, done);
  });
});

describe('RTCPool', () => {
  let events: EventHandler;
  let api: any;
  let pool: any;

  beforeEach(() => {
    events = new EventHandler(log, decoder);
    api = new APIMock();
    pool = createRTCPool(callIdMock, config.chat.rtc, log, events, api);
  });

  whenever(isWebRTCSupported())('should create an RTC connection', (done) => {
    getStream((stream) => {
      api.onDescription = (id: any, peer: any, sdp: any): void => {
        expect(api.descriptionSent).toBe(true);
        expect(id).toBe(callIdMock);
        expect(peer).toBe(peerAId);
        expect(sdp.type).toBe('offer');
        done();
      };

      events.onEvent(errorEvents.Error.tag, logError(done));

      addLocalStream(pool, stream);
      pool.create(peerAId);
    }, logError(done));
  });

  whenever(isWebRTCSupported())('should spawn an RTC connection on session description', (done) => {
    const peerTest = createRTCConnection(callIdMock, peerAId, config.chat.rtc, log, events, api);
    getStream((streamPeer) => {
      getStream((streamPool) => {
        addLocalStream(peerTest, streamPeer);

        peerTest.offer().then((offer) => {

          api.onDescription = (id: any, peer: any, sdp: any): void => {
            expect(api.descriptionSent).toBe(true);
            expect(id).toBe(callIdMock);
            expect(peer).toBe(peerAId);
            expect(sdp.type).toBe('answer');
            done();
          };

          events.onEvent(errorEvents.Error.tag, logError(done));

          addLocalStream(pool, streamPool);
          pool.onRemoteStream((peer: any, stream: any) => {
            expect(peer).toBe(peerAId);
          });

          events.notify(descr(offer));
        });
      }, logError(done));
    }, logError(done));
  });

  whenever(isWebRTCSupported())('should error on invalid session description', (done) => {
    getStream((stream) => {
      addLocalStream(pool, stream);
      events.onEvent(errorEvents.Error.tag, (error) => done());
      api.onDescription = (id: any, peer: any, sdp: any): void => done.fail();

      events.notify(descr({
        type: 'offer',
        sdp: invalidSDP
      }));
    }, logError(done));
  });

  whenever(isWebRTCSupported())('should error on invalid RTC signaling', (done) => {
    getStream((stream) => {
      addLocalStream(pool, stream);
      events.onEvent(errorEvents.Error.tag, (error) => done());
      api.onDescription = (id: any, peer: any, sdp: any): void => done.fail();

      events.notify(descr({
        type: 'answer',
        sdp: invalidSDP
      }));
    }, logError(done));
  });

  whenever(isWebRTCSupported())('should not send session description on peer answer', (done) => {
    const peer = createRTCConnection(callIdMock, peerBId, config.chat.rtc, log, events, api);
    getStream((streamPeer) => {
      getStream((streamPool) => {
        addLocalStream(peer, streamPeer);
        addLocalStream(pool, streamPool);

        events.onEvent(errorEvents.Error.tag, logError(done));

        api.onDescription = (id: any, peerId: any, sdp: any): void => {
          expect(api.descriptionSent).toBe(true);
          expect(id).toBe(callIdMock);
          expect(peerId).toBe(peerAId);
          expect(sdp.type).toBe('offer');

          api.onDescription = (id2: any, peerId2: any, sdp2: any): void => {
            expect(api.descriptionSent).toBe(true);
            expect(id2).toBe(callIdMock);
            expect(peerId2).toBe(peerBId);
            expect(sdp2.type).toBe('answer');
          };

          api.descriptionSent = false;

          peer.addOffer(sdp).then((answer) => {
            // Should not answer the answer.
            api.onDescription = (id3: any, peerId3: any, sdp3: any): void => done.fail();
            events.notify(descr(answer));
            done();
          }).catch(logError(done));
        };

        pool.create(peerAId);
      }, logError(done));
    }, logError(done));
  });
});
