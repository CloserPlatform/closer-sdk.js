import { ID } from '../../protocol/protocol';
import { CallstatsApi, WebRTCFunctions } from './callstats-api';
import { LoggerService } from '../../logger/logger-service';

export interface WebRTCStatsCollector {
  reportError(webRTCFunction: WebRTCFunctions, domError?: DOMError): void;
}

export class CallstatsCollector implements WebRTCStatsCollector {

  constructor(
    private callstats: CallstatsApi,
    private rtcPeerConnection: RTCPeerConnection,
    private callId: ID,
    private logger: LoggerService,
    peerId: ID,
  ) {
    callstats.addNewFabric(
      rtcPeerConnection,
      peerId,
      'multiplex',
      callId,
      {
        fabricTransmissionDirection: 'sendrecv',
        remoteEndpointType: 'peer'
      },
      () => this.logger.debug(`Collecting stats of Call(${callId}) with peer id: ${peerId}`),
    );
  }

  public reportError(
    webRTCFunction: WebRTCFunctions,
    domError?: DOMError,
  ): void {
      return this.callstats.reportError(
        this.rtcPeerConnection,
        this.callId,
        webRTCFunction,
        // tslint:disable-next-line:no-null-keyword
        domError || null,
        this.rtcPeerConnection.localDescription,
        this.rtcPeerConnection.remoteDescription,
      );
  }
}
