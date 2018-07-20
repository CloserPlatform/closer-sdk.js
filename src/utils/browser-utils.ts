import { DataChannel } from '../rtc/data-channel';
// tslint:disable-next-line
const adapter = require('webrtc-adapter');

export class BrowserUtils {

  public static readonly supportedBrowsers: {[browserName: string]: number} = {
    chrome: 67, // opera is also chrome
    firefox: 61,
    edge: 17134,
    safari: 605
  };

  /*
   * SDK supports Call.broadcast over DataChannel which is not supported by EDGE
   * Pass true if your logic is based on boradcast
   * WARNING: This will disable SDK on EDGE browser
   */
  public static isBrowserSupported(callBroadcastRequired = false): boolean {
    return adapter.browserDetails.version !== null
      && (callBroadcastRequired ? DataChannel.isSupported() : true)
      && BrowserUtils.isBrowserVersionSupported()
      && BrowserUtils.isWebRtcAvailable()
      && BrowserUtils.isUserMediaAvailable();
  }

  public static getBrowserName(): string {
    return adapter.browserDetails.browser;
  }

  public static getBrowserVersion(): string {
    return adapter.browserDetails.version;
  }

  public static getBrowserIntVersion(): number {
    return parseInt(BrowserUtils.getBrowserVersion(), 10);
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

  private static isBrowserVersionSupported(): boolean {
    return BrowserUtils.getBrowserIntVersion() >= BrowserUtils.supportedBrowsers[BrowserUtils.getBrowserName()];
  }

  private static isWebRtcAvailable(): boolean {
    return !!window.RTCPeerConnection;
  }

  private static isUserMediaAvailable(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}
