import { BrowserUtils } from '@closerplatform/closer-sdk';
import { Logger } from './logger';
import { EntryModule } from './entry.module';
import { Credentials } from './credentials';
import { makeDiv } from './view';

export class AppModule {

  public init(): void {
    const browserInfo = `${BrowserUtils.getBrowserName()} ${BrowserUtils.getBrowserVersion()}`;
    Logger.log(`Detected browser: ${browserInfo}`);

    if (!BrowserUtils.isBrowserSupported()) {
      alert(`Your browser (${browserInfo}) is not supported by CloserSDK`);
      throw new Error('Unsupported browser');
    } else {
      Logger.log('Browser is supported, initiating the app');
    }

    const entryModule = new EntryModule(
      makeDiv(),
      new Credentials()
    );

    entryModule.init();
  }
}
