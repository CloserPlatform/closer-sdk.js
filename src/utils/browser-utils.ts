// tslint:disable-next-line
const adapter = require('webrtc-adapter');

// tslint:disable:no-unnecessary-class
export class BrowserUtils {

  public static isBrowserSupported(): boolean {
    return adapter.browserDetails.version !== null; // tslint:disable-line
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
