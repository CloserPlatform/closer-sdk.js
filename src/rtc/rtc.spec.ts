// tslint:disable:max-file-line-count
// tslint:disable:no-let
import {
  apiKeyMock, config, getStream, isWebRTCSupported, log, logError, sessionIdMock,
  whenever
} from '../test-utils';
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
*   - should create valid SDP answers
*   - should renegotiate SDP on caller side
*   - should renegotiate SDP on callee side
*   - should renegotiate on addTrack
*   - should renegotiate on removeTrack
*/

const addLocalStream = (pool: RTCPool | RTCConnection, stream: MediaStream): void =>
  stream.getTracks().forEach((t) => pool.addTrack(t));

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
    peerAtest = new RTCConnection(callIdMock, peerBId, config.chat.rtc, log, api,
      (): void => undefined, (): void => undefined, []);
  });

  whenever(isWebRTCSupported())('should create valid SDP offers', (done) => {
    getStream((stream) => {
      addLocalStream(peerAtest, stream);

      expect(api.descriptionSent).toBe(false);

      peerAtest.startOffer().then((_offer: RTCSessionDescriptionInit) => {
        expect(api.descriptionSent).toBe(true);
        done();
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

      peerAtest.handleOffer(sdp).then(_answer => done.fail()).catch(_error => {
        expect(api.descriptionSent).toBe(false);
        done();
      });
    }, logError(done));
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
    const peerTest = new RTCConnection(callIdMock, peerAId, config.chat.rtc, log, api,
      (): void => undefined, (): void => undefined, []);
    getStream((streamPeer) => {
      getStream((streamPool) => {
        addLocalStream(peerTest, streamPeer);

        peerTest.startOffer().then((offer) => {

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
          pool.remoteTrack$.subscribe(({peerId}) => {
            expect(peerId).toBe(peerAId);
          });

          api.sendDescription(callIdMock, peerAId, offer);
        });
      }, logError(done));
    }, logError(done));
  });
});
