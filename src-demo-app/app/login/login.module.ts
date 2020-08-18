// tslint:disable:no-floating-promises
import { BoardModule } from '../board/board.module';
import { LoginService } from './login.service';
import { UrlService } from '../url.service';
import { Logger } from '../logger';
import { LoginFormData, makeLoginForm } from '../view';
import { Page } from '../page';

export class LoginModule {
  private loginBox?: JQuery;
  private loginService: LoginService;

  constructor(private actionboardModule: BoardModule) {
    this.loginService = new LoginService();
  }

  public init = (): void => {
    this.loginBox = this.renderLogin();

    Page.contents.append(this.loginBox);
  }

  private renderLogin = (): JQuery =>
    makeLoginForm('login-box', this.handleLoginProbe)

  private handleLoginProbe = (formData: LoginFormData): void => {
    this.loginService.login(UrlService.getURL(formData.authServer), formData.userEmail, formData.userPassword)
      .then(session => {
        if (this.loginBox) {
          this.loginBox.hide();
        } else {
          Logger.error('There is no loginbox');
        }

        this.actionboardModule.init(session, formData);
      }).catch(e => {
        Logger.error(`Error logging: ${e}`);
      });
  }
}
