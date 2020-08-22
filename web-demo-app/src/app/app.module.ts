import { BrowserUtils } from 'closer-sdk-js';
import { Logger } from './logger';
import { EntryModule } from './entry/entry.module';

export class AppModule {
  private entryModule: EntryModule;

  public init = (): void => {
    const browserInfo = `${BrowserUtils.getBrowserName()} ${BrowserUtils.getBrowserVersion()}`;
    Logger.log(`Detected browser: ${browserInfo}`);

    if (!BrowserUtils.isBrowserSupported()) {
      alert(`Your browser (${browserInfo}) is not supported by RatelSDK`);
      throw new Error('Unsupported browser');
    } else {
      Logger.log('Browser is supported, initiating the app');
    }

    this.entryModule = new EntryModule();

    this.entryModule.init();
  }
}
