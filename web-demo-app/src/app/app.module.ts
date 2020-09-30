import { PlatformSupport } from '@closerplatform/closer-sdk';
import { Logger } from './logger';
import { EntryModule } from './entry.module';
import { Storage } from './storage';

export class AppModule {

  public init(): void {
    const browserInfo = `${PlatformSupport.getBrowserName()} ${PlatformSupport.getBrowserVersion()}`;
    Logger.log(`Detected browser: ${browserInfo}`);

    if (!PlatformSupport.isChatSupported()) {
      alert(`Your browser (${browserInfo}) is not supported by CloserSDK`);
      throw new Error('Unsupported browser');
    } else {
      Logger.log('Browser is supported, initiating the app');
    }

    if (!PlatformSupport.isMediaSupported()) {
      alert(`Your browser (${browserInfo}) does not support media, only text chat will work`);
    }

    return this.getEntryModule().init();
  }

  private getEntryModule(): EntryModule {
    return new EntryModule(
      new Storage()
    );
  }
}
