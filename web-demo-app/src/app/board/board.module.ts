// tslint:disable: readonly-array
import { makeButton } from '../view';
import { BoardService } from './board.service';
import { Nav } from '../nav';
import { Credentials } from '../credentials';
import { Session } from '@closerplatform/closer-sdk';
import { Logger } from '../logger';
import { SubModule } from './submodule';

export enum ModuleNames {
  call = 'Call module',
  chat = 'Chat module',
  conversation = 'Conversation module'
}

type Modules = SubModule[];

export class BoardModule {
  public boardService: BoardService;
  private modules: Modules;

  constructor(public credentials: Credentials, session: Session) {
    this.boardService = new BoardService(session);
  }

  public init = (modules: Modules, defaultModule: SubModule | undefined = undefined): void => {
    this.modules = modules;
    modules.forEach(async module => {
      await module.init(this.boardService.session);
      if (module !== defaultModule) {
        await module.toggleVisible(false);
      }
    });
    this.renderNav();
  }

  public addModule = async (module: SubModule, makeVisible: boolean): Promise<void> => {
    await module.init(this.boardService.session, this.boardService.spinnerClient);
    if (makeVisible) {
      await this.makeVisible(module);
    }
    this.modules.push(module);
    this.renderNav();
  }

  public removeModule = async (module: SubModule): Promise<void> => {
    this.modules = this.modules.filter(m => m !== module);
    this.renderNav();
  }

  public toggleVisible = (visible = true): void => {
    this.modules.forEach(async module => {
      await module.toggleVisible(visible);
    });
  }

  public switchTo = async (moduleName: string): Promise<void> => {
    const module = this.modules.find(m => m.NAME === moduleName);

    if (module) {
      await this.makeVisible(module);
    } else {
      Logger.error(`Cannot switch to module ${moduleName}`);
    }
  }

  public renderNav = (): void => {
    if (this.modules) {
      const buttons = this.modules.map(module => {
        const button = makeButton('btn-info', module.NAME, async () => {
          await this.makeVisible(module);
        });

        return button;
      });

      Nav.setNavButtons(buttons);
    }

  }
  private makeVisible = async (module: SubModule): Promise<void> => {
    await module.toggleVisible();
    this.modules.filter(other => other !== module).forEach((other) => other.toggleVisible(false));

  }
}
