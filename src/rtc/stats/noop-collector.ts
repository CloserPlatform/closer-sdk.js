import { WebRTCStatsCollector } from './webrtc-stats-collector';

export class NoopCollector implements WebRTCStatsCollector {
  public reportError(): void {
    // do nothing
  }
}
