import { WebRTCStats } from '../../src/rtc/stats/webrtc-stats';

export const getWebrtcStatsMock = (): WebRTCStats =>
  new WebRTCStats();
