import { Logger } from './logger';

export const createStream = (callback: (stream: MediaStream) => void,
                             optionalConstraints?: MediaStreamConstraints): void => {
  const constraints = optionalConstraints || {
    audio: true,
    video: false
  };
  navigator.mediaDevices.getUserMedia(constraints).then(stream => {
    Logger.log('Local stream started!');
    callback(stream);
  }).catch((error) => {
    Logger.error('Could not start stream: ', error);
  });
};
