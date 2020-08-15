import { getRTCPeerConnection } from '../../mocks/peer-connection-facade.mock';
import { getDataChannelMock } from '../../mocks/data-channel.mock';
import { getQueueMock } from '../../mocks/queue.mock';
import { DataChannel, DataChannelMessage } from '../../../src/rtc/data-channel';
import { getLoggerServiceMock } from '../../mocks/logger.mock';

const queue = getQueueMock<DataChannelMessage>();
const logger = getLoggerServiceMock();

describe('DataChannel', () => {
  describe('isSupported', () => {
    it('supported', () => {
      expect(DataChannel.isSupported()).toBeTruthy();
    });
  });

  describe('createConnection', () => {
    it('call createDataChannel', () => {
      const rtcPeerConnection = getRTCPeerConnection();
      const dataChannel = getDataChannelMock(rtcPeerConnection, queue);
      spyOn(rtcPeerConnection, 'createDataChannel').and.callThrough();
      dataChannel.createConnection();
      expect(rtcPeerConnection.createDataChannel).toHaveBeenCalled();
    });

    it('log error when called twice', () => {
      const rtcPeerConnection = getRTCPeerConnection();
      const dataChannel = getDataChannelMock(rtcPeerConnection, queue, logger);
      spyOn(logger, 'error');
      spyOn(rtcPeerConnection, 'createDataChannel').and.callThrough();

      dataChannel.createConnection();

      expect(logger.error).not.toHaveBeenCalled();

      dataChannel.createConnection();

      expect(rtcPeerConnection.createDataChannel).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('add to queue if connection is not present', () => {
      const rtcPeerConnection = getRTCPeerConnection();
      const dataChannel = getDataChannelMock(rtcPeerConnection, queue, logger);
      spyOn(queue, 'add');
      const message = 'test';
      dataChannel.send(message);
      expect(queue.add).toHaveBeenCalledWith(message);
    });

    it('add to queue if connecting in progress', () => {
      const rtcPeerConnection = getRTCPeerConnection();
      const dataChannel = getDataChannelMock(rtcPeerConnection, queue, logger);
      spyOn(queue, 'add');
      const message = 'test';
      dataChannel.createConnection();
      dataChannel.send(message);
      expect(queue.add).toHaveBeenCalledWith(message);
    });
  });
});
