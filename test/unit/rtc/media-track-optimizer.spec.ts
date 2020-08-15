import { MediaTrackOptimizer } from '../../../src/rtc/media-track-optimizer';
import { getLoggerServiceMock } from '../../mocks/logger.mock';
import { load } from '../../../src/config/config';
import { getMediaStreamTrackMock } from '../../mocks/media-stream-track.mock';

const rtcConfig = load({
  rtc: {
    audioHint: 'speech',
    videoHint: 'motion'
  }
}).rtc;

export const getMediaTrackOptimizerMock = (): MediaTrackOptimizer =>
  new MediaTrackOptimizer(rtcConfig, getLoggerServiceMock());

describe('MediaTrackOptimizer', () => {

  const mediaTrackOptimizer = getMediaTrackOptimizerMock();

  it('optimize audio track if supported', () => {
    const supportedAudioTrack = getMediaStreamTrackMock('audio', '');
    mediaTrackOptimizer.addContentHint(supportedAudioTrack);
    expect(supportedAudioTrack.contentHint).toBe(rtcConfig.audioHint);
  });

  it('not optimize audio track if not supported', () => {
    const unsupportedAudioTrack = getMediaStreamTrackMock('audio');
    mediaTrackOptimizer.addContentHint(unsupportedAudioTrack);
    expect(unsupportedAudioTrack.contentHint).toBeUndefined();
  });

  it('not optimize audio track if supported but already defined', () => {
    const contentHint = 'music';
    const supportedAudioTrack = getMediaStreamTrackMock('audio', contentHint);
    mediaTrackOptimizer.addContentHint(supportedAudioTrack);
    expect(supportedAudioTrack.contentHint).toBe(contentHint);
  });

  it('optimize video track if supported', () => {
    const supportedVideoTrack = getMediaStreamTrackMock('video', '');
    mediaTrackOptimizer.addContentHint(supportedVideoTrack);
    expect(supportedVideoTrack.contentHint).toBe(rtcConfig.videoHint);
  });

  it('not optimize video track if not supported', () => {
    const unsupportedVideoTrack = getMediaStreamTrackMock('video');
    mediaTrackOptimizer.addContentHint(unsupportedVideoTrack);
    expect(unsupportedVideoTrack.contentHint).toBeUndefined();
  });

  it('not optimize video track if supported but already defined', () => {
    const contentHint = 'detail';
    const supportedVideoTrack = getMediaStreamTrackMock('video', contentHint);
    mediaTrackOptimizer.addContentHint(supportedVideoTrack);
    expect(supportedVideoTrack.contentHint).toBe(contentHint);
  });
});
