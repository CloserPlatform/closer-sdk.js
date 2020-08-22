// tslint:disable:no-floating-promises
import { SpinnerClient, AgentCtx } from '@swagger/spinner';
import { BoardModule } from '../board/board.module';
import { LoginService } from './login.service';
import { LoginFormData, makeLoginForm } from '../view';
import { Page } from '../page';
import { Credentials } from '../credentials';

export class LoginModule {
  private loginBox?: JQuery;
  private credentials: Credentials;
  private loginService = new LoginService();
  private boardModule = new BoardModule();

  public init = async (c: Credentials, sc: SpinnerClient): Promise<void> => {
    this.credentials = c;
    this.loginService.spinnerClient = sc;

    if (this.credentials.isSessionSaved()) {
      const agentCtx = await this.loginService.getSession(this.credentials);
      await this.proceedToBoard(agentCtx);
    } else {
      this.render();
    }
  }

  private proceedToBoard = async (agentCtx: AgentCtx): Promise<void> => {
    this.credentials.setAgentCtx(agentCtx.id, agentCtx.orgId, agentCtx.apiKey);
    await this.boardModule.init(agentCtx, this.credentials, this.loginService.spinnerClient);
  }

  private handleLoginProbe = async (formData: LoginFormData): Promise<void> => {
    this.credentials.setCredentials(formData.userEmail, formData.userPassword);

    try {
      const agentCtx =  await this.loginService.login(this.credentials);
      if (this.loginBox) {
        this.loginBox.hide();
      }
      this.proceedToBoard(agentCtx);
    } catch (e) {
      alert('Error logging');
    }
  }

  private render = (): void => {
    this.loginBox = makeLoginForm('login-box', this.handleLoginProbe);
    Page.contents.empty();
    Page.contents.append(this.loginBox);
  }
}
