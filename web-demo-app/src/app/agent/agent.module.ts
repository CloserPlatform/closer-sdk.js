
import { Logger } from '../logger';
import { Credentials } from '../credentials';
import { AgentCtx, SpinnerClient } from '@swagger/spinner';
import { AgentService } from './agent.service';
import { BoardModule } from '../board/board.module';
import { ChatModule } from '../chat/chat.module';
import { CallModule } from '../call/call.module';

export class AgentModule {
  public credentials: Credentials;
  private agentService = new AgentService();

  public init = async (agentCtx: AgentCtx, credentials: Credentials, sc: SpinnerClient): Promise<void> => {
    this.credentials = credentials;
    try {
      this.agentService.init(agentCtx, credentials, sc);

      const boardModule = new BoardModule(credentials, this.agentService.session);
      const chatModule = new ChatModule(credentials, this.agentService.session);
      const callModule = new CallModule(credentials, this.agentService.session);

      await boardModule.init([chatModule, callModule]);
    } catch (e) {
      this.handleConnectFailed(e as Error);
    }
  }

  private handleConnectFailed = (e: Error): void => {
    Logger.error('Authorization failed', e);
    alert('Authorization failed');
  }
}
