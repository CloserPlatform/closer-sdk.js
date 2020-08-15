
const constraints: MediaStreamConstraints = {
  audio: true,
  video: true,
  fake: true,
  // tslint:disable-next-line:no-object-literal-type-assertion
} as MediaStreamConstraints;

export const getUserMediaMock = async (): Promise<MediaStream> =>
  window.navigator.mediaDevices.getUserMedia(constraints)
