import { CallModule } from '../call/call.module';
import { ChatModule } from '../chat/chat.module';
import { makeButton } from '../view';
import { BoardService } from './board.service';
import { Nav } from '../nav';
import { Credentials } from '../credentials';
import { Session } from '@closerplatform/closer-sdk';
import { ConversationModule } from '../conversation/conversation.module';

type Module = CallModule | ChatModule | ConversationModule;
type Modules = ReadonlyArray<Module>;

export class BoardModule {
  public boardService: BoardService;
  private modules: Modules;

  constructor(public credentials: Credentials, session: Session) {
    this.boardService = new BoardService(session);
  }

  public toggleVisible = (visible = true): void => {
    this.modules.forEach(module => {
      module.toggleVisible(visible);
    });
  }

  public init = async (modules: Modules): Promise<void> => {
    this.modules = modules;
    modules.forEach(async module => {
      await module.init();
      module.toggleVisible(false);
    });
    this.renderNav();
  }

  public renderNav = (): void => {
    if (this.modules) {
      const buttons = this.modules.map(module => {
        const button = makeButton('btn-info', module.NAME, () => {
          module.toggleVisible();
          this.modules.filter(other => other !== module).forEach((other) => other.toggleVisible(false));
        });

        return button;
      });

      Nav.setNavButtons(buttons);
    }

  }
}
