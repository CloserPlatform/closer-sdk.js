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
  remoteEndpointType:
    'peer' | // The endpoint is a WebRTC client/peer.
    'server' // The endpoint is a media server or a middle-box.
  ;
  fabricTransmissionDirection:
    'sendonly' | // PeerConnection is for sending only.
    'receiveonly' | // PeerConnection is for receiving only.
    'sendrecv' | // PeerConnection is for sending and receiving.
    'inactive' // PeerConnection is inactive.
  ;
}

type CSError =
  'httpError' | // HTTP error, the csErrMsg string is reported by the browser.
  'authError' | // Authentication failed, AppID or AppSecret is incorrect.
  'wsChannelFailure' | // Connection failed, could not connect to callstats.io over WebSockets.
  'csProtoError' | // The client library is sending malformed messages.
  'success' | // The back-end has accepted the request and the endpoint is authenticated,
              // or capable of sending measurement data.
  'appConnectivityError' | // The connectivity checks for given PeerConnection object failed,
                           // i.e., iceConnectionState is set to disconnected.
  'tokenGenerationError' // Application could not generate the JWT.
  ;

export interface CallstatsApi {

  initialize(
    // application ID is obtained from callstats.io
    appId: string,
    // application ID is obtained from callstats.io
    appSecret: string,
    // it is provided by the developer and MUST NOT be null or empty
    localUserId: string | {
      userName: string;
      aliasName: string;
    },
    // asynchronously reports failure or success of the protocol messages
    initCallback?: (
      // status
      csError: CSError,
      // a descriptive message returned by callstats.io
      csErrMsg: string,
    ) => void,
    // asynchronously reports the conference statistics
    statsCallback?: (stats: any) => void,
    // it is the set of parameters to enable/disable certain features in the library
    configParams?: {
      // disables callstats.js's window.onbeforeunload parameter, it is enabled by default
      disableBeforeUnloadHandler?: boolean;
      // string of maximum length 30 characters
      applicationVersion?: string;
      // disables the pre-call test, it is enabled by default
      disablePrecalltest?: boolean;
      // the name/ID of the site/campus from where the call/pre-call test is made
      siteID?: string;
    },
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
