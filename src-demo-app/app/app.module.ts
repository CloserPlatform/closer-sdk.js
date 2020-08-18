import { LoginModule } from './login/login.module';
import { BoardModule } from './board/board.module';
import { Logger } from './logger';
import * as RatelSdk from '../../';

export class AppModule {
  private loginModule?: LoginModule;
  private boardModule?: BoardModule;

  public init = (): void => {
    const browserInfo = `${RatelSdk.BrowserUtils.getBrowserName()} ${RatelSdk.BrowserUtils.getBrowserVersion()}`;
    Logger.log(`Detected browser: ${browserInfo}`);

    if (!RatelSdk.BrowserUtils.isBrowserSupported()) {
      alert(`Your browser (${browserInfo}) is not supported by RatelSDK`);
      throw new Error('Unsupported browser');
    } else {
      Logger.log('Browser is supported, initiating the app');
    }

    this.boardModule = new BoardModule();
    this.loginModule = new LoginModule(this.boardModule);

    this.loginModule.init();
  }
}
