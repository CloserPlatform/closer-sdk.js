// tslint:disable:no-any

export type WebRTCFunctions =
  'getUserMedia' | // The failure occurred in getUserMedia function (added in callstats.js version 3.4.x).
  'createOffer' | // The failure occurred in createOffer function.
  'createAnswer' | // The failure occurred in createAnswer function.
  'setLocalDescription' | // The failure occurred in setLocalDescription function.
  'setRemoteDescription' | // The failure occurred in setRemoteDescription function.
  'addIceCandidate' | // The failure occurred in addIceCandidate function.
  'iceConnectionFailure' | // Ice connection failure detected by the application.
  'signalingError' | // Signaling related errors in the application.
  'applicationLog' // Application related logs, this will not be considered as a failure.
  ;

export type FabricEvent =
  'fabricHold' | // The fabric is currently not sending and receiving any media, but the connection is still active.
  'fabricResume' | // The fabric is resuming communication with the remote endpoint.
  'audioMute' | // The fabric is currently not sending any Audio, but MAY be sending video.
  'audioUnmute' | // The fabric is resuming Audio communication.
  'videoPause' | // The fabric is currently not sending any Video, but MAY be sending audio.
  'videoResume' | // The fabric is resuming Video communication.
  'fabricTerminated' | // The PeerConnection is destroyed and is no longer sending or receiving any media.
  'screenShareStart' | // The PeerConnection started the screen sharing.
  'screenShareStop' | // The PeerConnection stopped the screen sharing.
  'dominantSpeaker' | // The userID reports that it is the dominant speaker and not the remote participants.
  'activeDeviceList' // The userID reports the active devices used by him during the conference.
  ;

export interface FabricAttributes {
  readonly remoteEndpointType:
    'peer' | // The endpoint is a WebRTC client/peer.
    'server' // The endpoint is a media server or a middle-box.
  ;
  readonly fabricTransmissionDirection:
    'sendonly' | // PeerConnection is for sending only.
    'receiveonly' | // PeerConnection is for receiving only.
    'sendrecv' | // PeerConnection is for sending and receiving.
    'inactive' // PeerConnection is inactive.
  ;
}

export interface CallstatsInterface {

  initialize(
    appId: string,
    appSecret: string,
    localUserID: string,
    initCallback?: () => void,
    statsCallback?: (stats: any) => void,
    config?: any,
  ): void;

  addNewFabric(
    pcObject: RTCPeerConnection,
    remoteUserId: string,
    fabricUsage: 'multiplex' | // Describes a PeerConnection carrying multiple media streams on the same port.
      'audio' | // Describes an audio-only PeerConnection.
      'video' |	// Describes a video-only PeerConnection.
      'screen' | // Describes a screen-sharing PeerConnection.
      'data' | // Describes a PeerConnection with only DataChannels.
      'unbundled', // Describes a PeerConnection carrying media streams on different ports.
    conferenceId: string,
    fabricAttributes?: FabricAttributes,
    pcCallback?: () => void, // the callback asynchronously reports failure or success for pcObject.
  ): void;

  reportError(
    pcObject: RTCPeerConnection,
    conferenceId: string,
    webRTCFunctions: WebRTCFunctions,
    domError: DOMError | null,
    localSDP: RTCSessionDescription | null,
    remoteSDP: RTCSessionDescription | null,
  ): void;

  sendFabricEvent(
    pcObject: RTCPeerConnection,
    fabricEvent: FabricEvent,
    conferenceId: string,
    // tslint:disable-next-line:ban-types
    eventData: Object,
  ): void;
}
