import { getLoggerServiceMock } from './logger.mock';
import { getWebrtcStatsMock } from './webrtc-stats.mock';
import { getConfigMock } from './config.mock';
import { RTCPeerConnectionFacade } from '../../src/rtc/rtc-peer-connection-facade';
import { Queue } from '../../src/utils/queue';
import { getDataChannelMock } from './data-channel.mock';

export const getRTCPeerConnection = (): RTCPeerConnection =>
  new RTCPeerConnection(getConfigMock().rtc);

export const getRTCPeerConnectionFacade = (
  rtcPeerConnection = getRTCPeerConnection(),
  logger = getLoggerServiceMock(),
  candidateCb = (_candidate: RTCIceCandidate) => {},
  sdpCb = (_sdp: RTCSessionDescriptionInit) => {},
  queue = new Queue<RTCIceCandidateInit>(getLoggerServiceMock()),
  dataChannel = getDataChannelMock(rtcPeerConnection),
): RTCPeerConnectionFacade =>
  new RTCPeerConnectionFacade(
    rtcPeerConnection,
    queue,
    logger,
    dataChannel,
    getWebrtcStatsMock().createCollector(rtcPeerConnection, 'callId', 'peerId'),
    candidateCb,
    sdpCb,
    (): void => undefined,
    (): void => undefined,
  );
