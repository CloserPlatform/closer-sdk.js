// tslint:disable:no-floating-promises

import { Session } from '@closerplatform/closer-sdk';
import { Logger } from '../logger';
import { makeDiv, makeInputWithBtn } from '../view';
import { Page } from '../page';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';
import { Credentials } from '../credentials';
import { SpinnerClient } from '@swagger/spinner';
import { BoardModule } from '../board/board.module';

export class ChatModule {
  public readonly NAME = 'Chat module';
  public chatService: ChatService;

  private inner: JQuery;

  constructor (private boardModule: BoardModule, private credentials: Credentials) { }

  public init = (session: Session, spinnerClient: SpinnerClient): void => {
    this.chatService = new ChatService(session, spinnerClient);
    this.render();
  }

  public toggleVisible = (visible = true): void => {
    if (visible) {
      if (this.inner) {
        this.inner.show();
      }
    }
    else {
      if (this.inner) {
        this.inner.hide();
      }
    }
  }

  private roomCallback = async (inputValue: string): Promise<void> => {
    try {
      this.toggleVisible(false);
      this.credentials.setRoom(inputValue);
      const conversationModule = new ConversationModule(this.boardModule, this.credentials, inputValue);
      this.boardModule.addModule(conversationModule);
      this.boardModule.removeModule(this);
      this.boardModule.makeModuleVisible('Conversation module');
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
