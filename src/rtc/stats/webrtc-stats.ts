import { ID } from '../../protocol/protocol';
import { NoopCollector } from './noop-collector';
import { WebRTCStatsCollector } from './webrtc-stats-collector';

export class WebRTCStats {

  public createCollector(
    _rtcPeerConnection: RTCPeerConnection,
    _callId: ID,
    _peerId: ID,
  ): WebRTCStatsCollector {
    return new NoopCollector();
  }
}
