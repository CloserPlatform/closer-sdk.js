// tslint:disable:no-floating-promises

import { Session } from '@closerplatform/closer-sdk';
import { Logger } from '../logger';
import { makeDiv, makeInputWithBtn } from '../view';
import { Page } from '../page';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';
import { SpinnerClient } from '@swagger/spinner';
import { ModuleNames } from '../board/board.module';
import { SubModule } from '../board/submodule';

export class ChatModule extends SubModule {
  public readonly NAME = ModuleNames.chat;
  public chatService: ChatService;

  public init = async (session: Session, spinnerClient: SpinnerClient): Promise<void> => {
    this.chatService = new ChatService(session, spinnerClient);
    this.render();
  }

  private roomCallback = async (inputValue: string): Promise<void> => {
    try {
      this.toggleVisible(false);
      this.credentials.setRoom(inputValue);
      const conversationModule = new ConversationModule(this.boardModule, this.credentials, inputValue);
      this.boardModule.addModule(conversationModule, true);
      this.boardModule.removeModule(this);
    } catch (e) {
      Logger.error(e);
    }
  }

  private render = (): void => {
    const input = makeInputWithBtn(Page.roomInputId, this.roomCallback,
      'Connect to room', 'Room id...', this.credentials.roomId || '');

      this.inner = makeDiv().append(input);
      Page.contents.empty();
      Page.contents.append(this.inner);
  }
}
