import { CloserSDK, PlatformSupport, UserConfig } from '../../src';

const sessionId = '12345';
const apiKey = '54321';

const getCloserSDK = (config: UserConfig = {}): CloserSDK =>
  CloserSDK.init(config);

describe('Initialization', () => {
  it('initialize with API key and empty config', () => {
    spyOn(PlatformSupport, 'isChatSupported').and.returnValue(true);
    const session = getCloserSDK().withSession(sessionId, apiKey);

    expect(session.id).toBe(sessionId);
    expect(session.artichoke).toBeDefined();
    expect(PlatformSupport.isChatSupported).toHaveBeenCalled();

    session.artichoke.connection$.subscribe();
  });

  it('initialize with user config', () => {
    spyOn(PlatformSupport, 'isChatSupported').and.returnValue(true);
    const userConfig: UserConfig = {
      artichoke: {
        server: 'http://stage.anymind.com/artichoke'
      }
    };
    const session = getCloserSDK(userConfig).withSession(sessionId, apiKey);
    expect(PlatformSupport.isChatSupported).toHaveBeenCalled();

    session.artichoke.connection$.subscribe();
  });

  it('fail the initialization if browser is not supported', () => {
    spyOn(PlatformSupport, 'isChatSupported').and.returnValue(false);

    expect(getCloserSDK).toThrowError();
    expect(PlatformSupport.isChatSupported).toHaveBeenCalled();
  });
});
