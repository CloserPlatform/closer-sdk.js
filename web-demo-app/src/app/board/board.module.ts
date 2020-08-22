import { SpinnerClient, AgentCtx } from '@swagger/spinner';
import { Logger } from '../logger';
import { CallModule } from '../call/call.module';
import { ChatModule } from '../chat/chat.module';
import { makeButton } from '../view';
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

  public init = async (agentCtx: AgentCtx, credentials: Credentials, sc: SpinnerClient): Promise<void> => {
    this.credentials = credentials;
    try {
      await this.boardService.init(agentCtx, credentials, sc);
      this.render();
    } catch (e) {
      this.handleConnectFailed(e as Error);
    }
  }

  private render = (): void => {
    this.chatModule = new ChatModule(this.credentials, this.boardService.session);
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
