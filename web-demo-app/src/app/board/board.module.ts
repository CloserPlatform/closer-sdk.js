// tslint:disable: readonly-array
import { makeButton } from '../view';
import { Nav } from '../nav';
import { Session } from '@closerplatform/closer-sdk';
import { Logger } from '../logger';
import { SubModule } from '../submodule';
import { ChatModule } from '../chat/chat.module';
import { CallModule } from '../call/call.module';
import { ConversationModule } from '../conversation/conversation.module';

export enum ModuleNames {
  call = 'Call module',
  chat = 'Chat module',
  conversation = 'Conversation module'
}

export class BoardModule {

  constructor(
    private conversationModule: ConversationModule,
    private callModule: CallModule,
    private session: Session
  ) {
  }

  public init(): void {
    this.conversationModule.init();
    this.callModule.init();
    this.callModule.toggleVisible(false);
    this.renderNav();
  }

  public addModule(module: SubModule, makeVisible: boolean): void {
    module.init(this.session, this.boardService.spinnerClient);
    if (makeVisible) {
      this.makeVisible(module);
    }
    this.modules.push(module);
    this.renderNav();
  }

  public removeModule(module: SubModule): void {
    this.modules = this.modules.filter(m => m !== module);
    this.renderNav();
  }

  public toggleVisible(visible = true): void {
    this.modules.forEach(async module => {
      await module.toggleVisible(visible);
    });
  }

  public switchTo(moduleName: string): void {
    const module = this.modules.find(m => m.NAME === moduleName);

    if (module) {
      this.makeVisible(module);
    } else {
      Logger.error(`Cannot switch to module ${moduleName}`);
    }
  }

  public renderNav(): void {
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
  private makeVisible(module: SubModule): void {
    module.toggleVisible();
    this.modules.filter(other => other !== module).forEach((other) => other.toggleVisible(false));
  }
}
