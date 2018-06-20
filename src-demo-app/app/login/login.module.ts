import { ChatModule } from '../chat/chat.module';
import { LoginService } from './login.service';
import { UrlService } from '../url.service';
import { Logger } from '../logger';
import { LoginFormData, makeLoginForm } from '../view';
import { Page } from '../page';

export class LoginModule {

  private loginBox?: JQuery;

  constructor(private loginService: LoginService,
              private chatModule: ChatModule) {
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
        this.chatModule.init(session, formData);
      });
  }
}
