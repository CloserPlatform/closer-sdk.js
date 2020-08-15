import { BrowserUtils, CloserSDK } from '../../src';

describe('MachokeSDK', () => {
  it('be supported', () => {
    spyOn(BrowserUtils, 'isBrowserSupported').and.returnValue(true);
    expect(CloserSDK.isSupported()).toBe(true);
  });

  it('be not supported', () => {
    spyOn(BrowserUtils, 'isBrowserSupported').and.returnValue(false);
    expect(CloserSDK.isSupported()).toBe(false);
  });
});
