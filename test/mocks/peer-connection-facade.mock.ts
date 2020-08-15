import { getLoggerServiceMock } from './logger.mock';
import { getWebrtcStatsMock } from './webrtc-stats.mock';
import { getConfigMock } from './config.mock';
import { RTCPeerConnectionFacade } from '../../src/rtc/rtc-peer-connection-facade';
import { getArtichokeApiMock } from './artichoke-api.mock';
import { Queue } from '../../src/utils/queue';
import { getDataChannelMock } from './data-channel.mock';
import { Delayer } from '../../src/utils/delayer';

export const getRTCPeerConnection = (): RTCPeerConnection =>
  new RTCPeerConnection(getConfigMock().rtc);

export const getRTCPeerConnectionFacade = (
  rtcPeerConnection = getRTCPeerConnection(),
  logger = getLoggerServiceMock(),
  artichokeApi = getArtichokeApiMock(),
  queue = new Queue<RTCIceCandidateInit>(getLoggerServiceMock()),
  dataChannel = getDataChannelMock(rtcPeerConnection),
  callId = '1',
  peerId = '2'
): RTCPeerConnectionFacade =>
  new RTCPeerConnectionFacade(
    callId,
    peerId,
    rtcPeerConnection,
    artichokeApi,
    (): void => undefined,
    (): void => undefined,
    queue,
    logger,
    dataChannel,
    new Delayer(),
    [],
    getWebrtcStatsMock()
  );
