import { getUserMediaMock } from '../mocks/get-user-media.mock';
import { getRTCPeerConnectionFacade, getRTCPeerConnection } from '../mocks/peer-connection-facade.mock';
import { getLoggerServiceMock } from '../mocks/logger.mock';
import { createAnswer } from '../mocks/rtc-peer-connection.mock';

const logger = getLoggerServiceMock();

describe('Integration: PeerConnectionFacade', () => {
  describe('addTrack', () => {
    it('add tracks and create senders', async () => {
      const stream = await getUserMediaMock();
      const tracks = stream.getTracks();
      const rtcPeerConnection = getRTCPeerConnection();
      const peerConnectionFacade = getRTCPeerConnectionFacade(rtcPeerConnection);
      tracks.forEach(track => peerConnectionFacade.addTrack(track));
      expect(rtcPeerConnection.getSenders().map(sender => sender.track)).toEqual(tracks);
    });

    it('do not add corrupted track and log error', () => {
      const rtcPeerConnection = getRTCPeerConnection();
      const peerConnectionFacade = getRTCPeerConnectionFacade(rtcPeerConnection, logger);
      spyOn(logger, 'error');
      // tslint:disable-next-line:no-any
      peerConnectionFacade.addTrack({} as any);
      expect(rtcPeerConnection.getSenders().map(sender => sender.track).length).toBe(0);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('handleRemoteAnswer', () => {
    it('fail to set remote sdp without local', async done => {
      const rtcPeerConnection = getRTCPeerConnection();
      const peerConnectionFacade = getRTCPeerConnectionFacade(rtcPeerConnection, logger);

      const stream = await getUserMediaMock();
      stream.getTracks().forEach(track => peerConnectionFacade.addTrack(track));
      const localOffer = await rtcPeerConnection.createOffer();
      const remoteAnswer = await createAnswer(localOffer);

      try {
        await peerConnectionFacade.handleRemoteAnswer(remoteAnswer);
        done.fail('no error');
      } catch (e) {
        expect(String(e)).toContain('set remote answer');
        done();
      }
    });
  });
});
