// tslint:disable:max-file-line-count
// tslint:disable:no-let
import { apiKeyMock, config, getStream, isWebRTCSupported, log, sessionIdMock, sleep, whenever } from '../test-utils';
import { ID } from '../protocol/protocol';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { RTCConnection } from './rtc-connection';
import { RTCPool } from './rtc-pool';

const invalidSDP = 'this is not a valid SDP';

const callIdMock = '123';
const peerAId = '321';
const peerBId = '333';

/*  TODO:
*   Add tests:
*   - should error on invalid session description
*   - should error on invalid RTC signaling
*   - should not send session description on peer answer
*/

// tslint:disable-next-line:no-any
const logError = (done: DoneFn): (err: any) => void =>
  (error): void => {
    log.error(`Got an error: ${error} (${JSON.stringify(error)})`);
    if (typeof error.cause !== 'undefined') {
      log.error(`Cause: ${error.cause}`);
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
  let api: APIMock;
  let peerAtest: RTCConnection;

  beforeEach(() => {
    api = new APIMock();
    peerAtest = new RTCConnection(callIdMock, peerBId, config.chat.rtc, log, api);
  });

  whenever(isWebRTCSupported())('should create valid SDP offers', (done) => {
    getStream((stream) => {
      addLocalStream(peerAtest, stream);

      expect(api.descriptionSent).toBe(false);

      peerAtest.offer().then((_offer: RTCSessionDescriptionInit) => {
        expect(api.descriptionSent).toBe(true);
        done();
      }).catch(logError(done));
    }, logError(done));
  });

  whenever(isWebRTCSupported())('should create valid SDP answers', (done) => {
    const peerB = new RTCConnection(callIdMock, peerAId, config.chat.rtc, log, api);

    getStream((streamA) => {
      addLocalStream(peerAtest, streamA);
      // Peer A offers a connection.
      peerAtest.offer().then((offer: RTCSessionDescriptionInit) => {
        getStream((streamB) => {
          addLocalStream(peerB, streamB);

          api.descriptionSent = false;
          // Peer B accepts & answers it.
          peerB.setRemoteDescription(offer).then((_sdp) => {
            peerB.answer().then((_answer) => {
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

      peerAtest.addOffer(sdp).then(_answer => done.fail()).catch(_error => {
        expect(api.descriptionSent).toBe(false);
        done();
      });
    }, logError(done));
  });

  const testRenegotiation = (peerA: RTCConnection, peerB: RTCConnection, trigger: () => void,
                             calleeId: string, done: DoneFn): void => {
    // 0. Initial setup...
    getStream((streamA) => {
      log.info('Got stream A.');
      getStream((streamB) => {
        log.info('Got stream B.');
        addLocalStream(peerA, streamA);
        addLocalStream(peerB, streamB);

        // 4. Peers exchange candidates.
        // FIXME
        // tslint:disable-next-line:readonly-array
        const candidates: {peer: ID; candidate: RTCIceCandidate}[] = [];
        api.onCandidate = (_call: ID, peer: ID, candidate: RTCIceCandidate): void => {
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
            api.onDescription = (_id, peer, description): void => {
              expect(description.type).toBe('offer');
              expect(peer).toBe(calleeId);
              log.info('Renegotiation successful.');
              done();
            };

            // 5. Innitiator triggers a renegotiation.
            // FIXME This sleep is required so that the connection has the time to
            // FIXME transition into an established state.
            sleep(RTCConnection.renegotiationTimeout).then(trigger);
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
        peerA.offer().then((offer: RTCSessionDescriptionInit) => {
          log.info('Sent offer.');
          // 2. Peer B answers it.
          peerB.addOffer(offer).then((answer: RTCSessionDescriptionInit) => {
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
    const peerB = new RTCConnection(callIdMock, peerAId, config.chat.rtc, log, api);
    testRenegotiation(peerAtest, peerB, () => {
      getStream((newStream) => {
        log.info('Got new stream. Triggering renegotiation...');
        addLocalStream(peerAtest, newStream);
      }, logError(done));
    }, peerBId, done);
  });

  whenever(isWebRTCSupported())('should renegotiate SDP on callee side', (done) => {
    const peerB = new RTCConnection(callIdMock, peerAId, config.chat.rtc, log, api);
    testRenegotiation(peerAtest, peerB, () => {
      getStream((newStream) => {
        log.info('Got new stream. Triggering renegotiation...');
        addLocalStream(peerB, newStream);
      }, logError(done));
    }, peerAId, done);
  });

  whenever(isWebRTCSupported())('should renegotiate on addTrack', (done) => {
    const peerB = new RTCConnection(callIdMock, peerAId, config.chat.rtc, log, api);
    testRenegotiation(peerAtest, peerB, () => {
      getStream((newStream) => {
        log.info('Got new stream. Adding a stream track...');
        peerAtest.addTrack(newStream.getTracks()[0], newStream);
      }, logError(done));
    }, peerBId, done);
  });

  whenever(isWebRTCSupported())('should renegotiate on removeTrack', (done) => {
    const peerB = new RTCConnection(callIdMock, peerAId, config.chat.rtc, log, api);
    testRenegotiation(peerAtest, peerB, () => {
      log.info('Removing a stream track...');
      // FIXME
      // tslint:disable-next-line:no-any
      peerAtest.removeTrack((peerAtest as any).rtcPeerConnection.getLocalStreams()[0].getTracks()[0]);
    }, peerBId, done);
  });
});

describe('RTCPool', () => {
  let api: APIMock;
  let pool: RTCPool;

  beforeEach(() => {
    api = new APIMock();
    pool = new RTCPool(callIdMock, config.chat.rtc, log, api);
  });

  whenever(isWebRTCSupported())('should create an RTC connection', (done) => {
    getStream((stream) => {
      api.onDescription = (id: string, peer: string, sdp: RTCSessionDescriptionInit): void => {
        expect(api.descriptionSent).toBe(true);
        expect(id).toBe(callIdMock);
        expect(peer).toBe(peerAId);
        expect(sdp.type).toBe('offer');
        done();
      };

      spyOn(log, 'error').and.callThrough();
      expect(log.error).not.toHaveBeenCalled();

      addLocalStream(pool, stream);
      pool.create(peerAId);
    }, logError(done));
  });

  whenever(isWebRTCSupported())('should spawn an RTC connection on session description', (done) => {
    const peerTest = new RTCConnection(callIdMock, peerAId, config.chat.rtc, log, api);
    getStream((streamPeer) => {
      getStream((streamPool) => {
        addLocalStream(peerTest, streamPeer);

        peerTest.offer().then((offer) => {

          api.onDescription = (id: string, peer: string, sdp: RTCSessionDescriptionInit): void => {
            expect(api.descriptionSent).toBe(true);
            expect(id).toBe(callIdMock);
            expect(peer).toBe(peerAId);
            expect(sdp.type).toBe('offer');
            done();
          };

          spyOn(log, 'error').and.callThrough();
          expect(log.error).not.toHaveBeenCalled();

          addLocalStream(pool, streamPool);
          pool.remoteStream$.subscribe(({peerId}) => {
            expect(peerId).toBe(peerAId);
          });

          api.sendDescription(callIdMock, peerAId, offer);
        });
      }, logError(done));
    }, logError(done));
  });
});
