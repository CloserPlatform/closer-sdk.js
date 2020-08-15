import { LoggerService } from '../logger/logger-service';
import { MediaTrackContentHint } from './media-track-content-hint';
import { RTCConfig } from '../config/rtc-config';

type MediaStreamTrackWithContentHint = MediaStreamTrack & MediaTrackContentHint;

export class MediaTrackOptimizer {

  constructor(
    private rtcConfig: RTCConfig,
    private logger: LoggerService,
  ) {
  }

  /**
   * Try to add contentHint according to:
   * https://w3c.github.io/mst-content-hint/#introduction
   * Available in chrome 70v+
   */
  public addContentHint(track: MediaStreamTrackWithContentHint): void {
    if (track.kind === 'audio') {
      this.addConentHintToAudioTrack(track);
    } else {
      this.addConentHintToVideoTrack(track);
    }
  }

  private addConentHintToAudioTrack(track: MediaStreamTrackWithContentHint): void {
    if (this.rtcConfig.audioHint) {
      if (track.contentHint === '') {
        track.contentHint = this.rtcConfig.audioHint;
        this.logger.debug(`Applied ${this.rtcConfig.audioHint} content hint to audio track ${track.id}`);
      } else {
        this.logger.debug(`Cannot apply content hint - not supported by current browser`);
      }
    }
  }

  private addConentHintToVideoTrack(track: MediaStreamTrackWithContentHint): void {
    if (this.rtcConfig.videoHint) {
      if (track.contentHint === '') {
        track.contentHint = this.rtcConfig.videoHint;
        this.logger.debug(`Applied ${this.rtcConfig.videoHint} content hint to video track ${track.id}`);
      } else {
        this.logger.debug(`Cannot apply content hint - not supported by current browser`);
      }
    }
  }
}
