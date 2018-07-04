// tslint:disable-next-line
const adapter = require('webrtc-adapter');

export class BrowserUtils {

  public static isBrowserSupported(): boolean {
    return adapter.browserDetails.version !== null
      && !!window.RTCPeerConnection
      && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  public static getBrowserName(): string {
    return adapter.browserDetails.browser;
  }

  public static getBrowserVersion(): string {
    return adapter.browserDetails.version;
  }

  public static isChrome(): boolean {
    return adapter.browserDetails.browser === 'chrome';
  }

  public static isFirefox(): boolean {
    return adapter.browserDetails.browser === 'firefox';
  }

  public static isEdge(): boolean {
    return adapter.browserDetails.browser === 'edge';
  }

  public static isSafari(): boolean {
    return adapter.browserDetails.browser === 'safari';
  }
}
