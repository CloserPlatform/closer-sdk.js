// tslint:disable: readonly-array
import { CallModule } from '../call/call.module';
import { ChatModule } from '../chat/chat.module';
import { makeButton } from '../view';
import { BoardService } from './board.service';
import { Nav } from '../nav';
import { Credentials } from '../credentials';
import { Session } from '@closerplatform/closer-sdk';
import { ConversationModule } from '../conversation/conversation.module';
import { SpinnerClient } from '@swagger/spinner';
import { Logger } from '../logger';

export enum ModuleNames {
  call = 'Call module',
  chat = 'Chat module',
  conversation = 'Conversation module'
}

type Module = CallModule | ChatModule | ConversationModule;
type Modules = Module[];

export class BoardModule {
  public boardService: BoardService;
  private modules: Modules;

  constructor(public credentials: Credentials, session: Session, spinnerClient: SpinnerClient) {
    this.boardService = new BoardService(session, spinnerClient);
  }

  public init = (modules: Modules, defaultModule: Module | undefined = undefined): void => {
    this.modules = modules;
    modules.forEach(async module => {
      await module.init(this.boardService.session, this.boardService.spinnerClient);
      if (module !== defaultModule) {
        module.toggleVisible(false);
      }
    });
    this.renderNav();
  }

  public addModule = async (module: Module, makeVisible: boolean): Promise<void> => {
    await module.init(this.boardService.session, this.boardService.spinnerClient);
    if (makeVisible) {
      this.makeVisible(module);
    }
    this.modules.push(module);
    this.renderNav();
  }

  public removeModule = async (module: Module): Promise<void> => {
    this.modules = this.modules.filter(m => m !== module);
    this.renderNav();
  }

  public toggleVisible = (visible = true): void => {
    this.modules.forEach(module => {
      module.toggleVisible(visible);
    });
  }

  public makeModuleVisible = (moduleName: string): void => {
    const module = this.modules.find(m => m.NAME === moduleName);
    if (module) {
      this.makeVisible(module);
    }
  }

  public switch = (moduleName: string): void => {
    const module = this.modules.find(m => m.NAME === moduleName);

    if (module) {
      this.makeVisible(module);
    } else {
      Logger.error(`Cannot switch to module ${moduleName}`);
    }
  }

  public renderNav = (): void => {
    if (this.modules) {
      const buttons = this.modules.map(module => {
        const button = makeButton('btn-info', module.NAME, () => {
          this.makeVisible(module);
        });

        return button;
      });

      Nav.setNavButtons(buttons);
    }

  }
  private makeVisible = (module: Module): void => {
    module.toggleVisible();
    this.modules.filter(other => other !== module).forEach((other) => other.toggleVisible(false));

  }
}
