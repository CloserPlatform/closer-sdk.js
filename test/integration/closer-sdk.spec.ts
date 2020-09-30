import { PlatformSupport, CloserSDK } from '../../src';

describe('MachokeSDK', () => {
  it('be supported', () => {
    spyOn(PlatformSupport, 'isChatSupported').and.returnValue(true);
    expect(CloserSDK.isChatSupported()).toBe(true);
  });

  it('be not supported', () => {
    spyOn(PlatformSupport, 'isChatSupported').and.returnValue(false);
    expect(CloserSDK.isChatSupported()).toBe(false);
  });
});
