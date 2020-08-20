// tslint:disable:no-any
import { SpinnerClient } from '@swagger/spinner';
import { BoardModule } from '../board/board.module';
import { LoginService } from './login.service';
import { UrlService } from '../url.service';
import { Logger } from '../logger';
import { LoginFormData, makeLoginForm } from '../view';
import { Page } from '../page';
import { Credentials } from '../credentials';

export class LoginModule {
  private loginBox?: JQuery;
  private loginService: LoginService;
  private credentials: Credentials;

  private boardModule: BoardModule;

  constructor() {
    this.loginService = new LoginService();
    this.boardModule = new BoardModule();
  }

  public init = (c: Credentials, sc: SpinnerClient): void => {
    this.credentials = c;
    this.loginService.spinnerClient = sc;
    this.loginBox = this.renderLogin();

    Page.contents.empty();
    Page.contents.append(this.loginBox);
  }

  private renderLogin = (): JQuery =>
    makeLoginForm('login-box', this.handleLoginProbe)

  private handleLoginProbe = async (formData: LoginFormData): Promise<any> => {
    this.credentials.setCredentials(formData.userEmail, formData.userPassword);

    try {
      const agentCtx =  await this.loginService.login(this.credentials);

      this.credentials.setAgentCtx(agentCtx.id, agentCtx.orgId, agentCtx.apiKey);
      this.loginBox.hide();
      await this.boardModule.init(agentCtx, this.credentials, this.loginService.spinnerClient);
    } catch (e) {
      alert(`Error logging ${e}`);
    }
  }
}
