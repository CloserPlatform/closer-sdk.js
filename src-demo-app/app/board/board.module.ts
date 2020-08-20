// tslint:disable:no-any

import { SpinnerClient, AgentCtx } from '@swagger/spinner';
import * as RatelSdk from '../../../';
import { Logger } from '../logger';
import { CallModule } from '../call/call.module';
import { ChatModule } from '../chat/chat.module';
import { AuthSession } from '../login/login.service';
import { LoginFormData, makeButton, makeDiv } from '../view';
import { BoardService } from './board.service';
import { Nav } from '../nav';
import { Credentials } from '../credentials';

export class BoardModule {
  private boardService: BoardService;
  private credentials: Credentials;

  private chatModule: ChatModule;
  private callModule: CallModule;

  constructor() {
    this.boardService = new BoardService();
  }

  public init = async (agentCtx: AgentCtx, credentials: Credentials, sc: SpinnerClient): Promise<any> => {
    const success = await this.boardService.init(agentCtx, credentials, sc);

    if (!success) {
      this.handleConnectFailed(new Error('Couldn\'t initialize session'));
    } else {
      this.render();
    }
  }
  private render = (): void => {
    this.chatModule = new ChatModule(this.boardService.session);
    this.callModule = new CallModule();

    this.renderNav();

    this.chatModule.init();
    this.callModule.init(this.boardService.session);

    this.callModule.toggleVisible(false);
  }

  private renderNav = (): void => {
    const chatButton = makeButton('btn-info', 'CHAT MODULE', () => {
      this.chatModule.toggleVisible();
      this.callModule.toggleVisible(false);
    });
    const callButton = makeButton('btn-info', 'CALLS MODULE', () => {
      this.callModule.toggleVisible();
      this.chatModule.toggleVisible(false);
    });

    Nav.setNavButtons([chatButton, callButton]);
  }

  private handleConnectFailed = (e: Error): void => {
    Logger.error('Authorization failed', e);
    alert('Authorization failed');
  }
}
