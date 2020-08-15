/**
 * Docs https://w3c.github.io/mst-content-hint/
 */

export type VideoHint = 'motion' | 'detail' | 'text';

export type AudioHint = 'speech' | 'music';

export type ContentHint = VideoHint | AudioHint | '';

export interface MediaTrackContentHint {
  contentHint?: ContentHint;
}
