import adapter from 'webrtc-adapter';
import { DataChannel } from '../rtc/data-channel';

export class BrowserUtils {

  private static readonly supportedBrowsers: {readonly [browserName: string]: number} = {
    chrome: 67, // opera is also recognized as chrome by webrtc-adapter
    firefox: 61,
    edge: 17134,
    safari: 605
  };

  // tslint:disable-next-line:cyclomatic-complexity
  public static isBrowserSupported(): boolean {
    return BrowserUtils.isWebRtcAvailable()
      && adapter.browserDetails.version !== null
      && DataChannel.isSupported()
      && BrowserUtils.isBrowserVersionSupported()
      && BrowserUtils.isUserMediaAvailable();
  }

  public static getBrowserName(): string {
    return adapter.browserDetails.browser;
  }

  public static getBrowserVersion(): number | undefined {
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

  private static isBrowserVersionSupported(): boolean {
    const maybeBrowserVersion = BrowserUtils.getBrowserVersion();

    return typeof maybeBrowserVersion !== 'undefined' &&
      maybeBrowserVersion >= BrowserUtils.supportedBrowsers[BrowserUtils.getBrowserName()];
  }

  private static isWebRtcAvailable(): boolean {
    return !!window.RTCPeerConnection;
  }

  private static isUserMediaAvailable(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}
