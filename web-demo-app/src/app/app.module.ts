import { BrowserUtils } from '@closerplatform/closer-sdk';
import { Logger } from './logger';
import { EntryModule } from './entry.module';
import { LoginModule } from './login/login.module';
import { GuestModule } from './guest.module';
import { Credentials } from './credentials';
import { LoginService } from './login/login.service';
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

    const loginService = new LoginService();

    const loginModule = new LoginModule(loginService);
    const guestModule = new GuestModule(makeDiv());
    const credentials = new Credentials();

    const entryModule = new EntryModule(
      makeDiv(),
      loginModule,
      guestModule,
      credentials
    );

    entryModule.init();
  }
}
