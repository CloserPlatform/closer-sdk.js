import { getUserMediaMock } from './get-user-media.mock';
import { getRTCPeerConnection } from './peer-connection-facade.mock';

export const createOffer = async (): Promise<RTCSessionDescriptionInit> => {
  const stream = await getUserMediaMock();
  const rtcPeerConnection = getRTCPeerConnection();
  stream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, new MediaStream()));

  return rtcPeerConnection.createOffer();
};

export const createAnswer = async (offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
  const stream = await getUserMediaMock();
  const rtcPeerConnection = getRTCPeerConnection();
  rtcPeerConnection.setRemoteDescription(offer);
  stream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, new MediaStream()));

  return rtcPeerConnection.createAnswer();
};
