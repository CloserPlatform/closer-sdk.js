// tslint:disable:no-any

import * as RatelSdk from '../../../';
import { Logger } from '../logger';
import { CallModule } from '../call/call.module';
import { ChatModule } from '../chat/chat.module';
import { AuthSession } from '../login/login.service';
import { LoginFormData, makeButton, makeDiv } from '../view';
import { BoardService } from './board.service';

export class BoardModule {
  private boardService: BoardService;

  private chatModule: ChatModule;
  private callModule: CallModule;

  constructor() {
    this.boardService = new BoardService();
  }

  public init = async (authSession: AuthSession, loginFormData: LoginFormData): Promise<any> => {
    const success = await this.boardService.init(authSession, loginFormData);

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

    const navigation = makeDiv().prop({
      class: 'd-flex justify-content-center align-items-center m-3 bg-light'
    }).append([chatButton, callButton]);

    $('#nav').append(navigation);
  }

  private handleConnectFailed = (e: Error): void => {
    Logger.error('Authorization failed', e);
    alert('Authorization failed');
  }
}
