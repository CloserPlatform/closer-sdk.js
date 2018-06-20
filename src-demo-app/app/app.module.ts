import * as RatelSDK from '../../';
import { LoginModule } from './login/login.module';
import { ChatModule } from './chat/chat.module';
import { SessionService } from './chat/session.service';
import { LoginService } from './login/login.service';
import { Logger } from './logger';

export class AppModule {

  private loginModule?: LoginModule;
  private chatModule?: ChatModule;

  public init = (): void => {
    if (!RatelSDK.BrowserUtils.isBrowserSupported()) {
      alert('This browser is not supported by RatelSDK');
      throw new Error('Unsupported browser.');
    } else {
      Logger.log('Browser is supported, initing the app');
    }

    const sessionService = new SessionService();
    const loginService = new LoginService();

    this.chatModule = new ChatModule(sessionService);
    this.loginModule = new LoginModule(loginService, this.chatModule);

    this.loginModule.init();
  }
}
