import { DataChannel } from '../../src/rtc/data-channel';
import { getLoggerServiceMock } from './logger.mock';
import { getQueueMock } from './queue.mock';

export const getDataChannelMock = (
  rtcPeerConnection: RTCPeerConnection,
  queue = getQueueMock<string>(),
  logger = getLoggerServiceMock()
): DataChannel =>
  new DataChannel(
    '1',
    (): void => undefined,
    rtcPeerConnection,
    logger,
    queue,
  );
