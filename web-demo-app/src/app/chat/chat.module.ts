// tslint:disable:no-floating-promises
import { Logger } from '../logger';
import { makeDiv, makeInputWithBtn } from '../view';
import { Page } from '../page';
import { ConversationModule } from '../conversation/conversation.module';
import { ModuleNames } from '../board/board.module';
import { Credentials } from '../credentials';

export class ChatModule {
  public readonly NAME = ModuleNames.chat;

  constructor(
    private html: JQuery,
    private credentials: Credentials
  ) { }

  public init(): void {
    this.render();
  }

  private roomCallback(roomId: string): void {
    try {
      this.toggleVisible(false);
      this.credentials.setRoom(roomId);
      const conversationModule = new ConversationModule(makeDiv(), this.boardModule, this.credentials, roomId);
      this.boardModule.addModule(conversationModule, true);
      this.boardModule.removeModule(this);
    } catch (e) {
      Logger.error(e);
    }
  }

  private render(): void {
    const input = makeInputWithBtn(
      Page.roomInputId,
      roomId => this.roomCallback(roomId),
      'Connect to room', 'Room id...',
      this.credentials.getRoomId() || '',
    );

    this.html.append(input);
    Page.contents.empty();
    Page.contents.append(this.html);
  }
}
