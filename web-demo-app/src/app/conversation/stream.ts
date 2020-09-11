
export async function createStream(optionalConstraints?: MediaStreamConstraints): Promise<MediaStream> {
  const constraints = optionalConstraints || {
    audio: true,
    video: true
  };

  return navigator.mediaDevices.getUserMedia(constraints);
};
