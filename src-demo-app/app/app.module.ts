import { LoginModule } from './login/login.module';
import { ChatModule } from './chat/chat.module';
import { SessionService } from './chat/session.service';
import { LoginService } from './login/login.service';
import { Logger } from './logger';
import * as RatelSdk from '../../';

export class AppModule {

  private loginModule?: LoginModule;
  private chatModule?: ChatModule;

  public init = (): void => {
    const browserInfo = `${RatelSdk.BrowserUtils.getBrowserName()} ${RatelSdk.BrowserUtils.getBrowserVersion()}`;
    Logger.log(`Detected browser: ${browserInfo}`);

    if (!RatelSdk.BrowserUtils.isBrowserSupported()) {
      alert(`Your browser (${browserInfo}) is not supported by RatelSDK`);
      throw new Error('Unsupported browser');
    } else {
      Logger.log('Browser is supported, initiating the app');
    }

    const sessionService = new SessionService();
    const loginService = new LoginService();

    this.chatModule = new ChatModule(sessionService);
    this.loginModule = new LoginModule(loginService, this.chatModule);

    this.loginModule.init();
  }
}
