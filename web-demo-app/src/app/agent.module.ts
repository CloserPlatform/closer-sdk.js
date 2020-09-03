
import { Logger } from './logger';
import { Credentials } from './credentials';
import { BoardModule } from './board/board.module';
import { ChatModule } from './chat/chat.module';
import { CallModule } from './call/call.module';

export class AgentModule {
  public credentials: Credentials;

  public async init(agentCtx: AgentCtx, credentials: Credentials): Promise<void> {
    this.credentials = credentials;
    try {
      this.sessionService.connect(agentCtx, credentials);

      const boardModule = new BoardModule(credentials, this.agentService.session);
      const chatModule = new ChatModule(boardModule, credentials);
      const callModule = new CallModule(boardModule, credentials);

      boardModule.init([chatModule, callModule], chatModule);
    } catch (e) {
      this.handleConnectFailed(e as Error);
    }
  }

  private handleConnectFailed = (e: Error): void => {
    Logger.error('Authorization failed', e);
    alert('Authorization failed');
  }
}
