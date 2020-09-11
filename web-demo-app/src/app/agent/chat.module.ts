/* // tslint:disable:no-floating-promises
import { Logger } from '../logger';
import { makeDiv, makeInputWithBtn } from '../view';
import { Page } from '../page';
import { ConversationModule } from '../conversation/conversation.module';
import { ModuleNames } from './board.module';
import { Credentials } from '../credentials';
import { Session } from '../../../../dist';

export class ChatModule {
  public readonly NAME = ModuleNames.chat;

  constructor(
    private html: JQuery,
    private credentials: Credentials,
    private session: Session,
  ) { }

  public init(): void {
    this.render();
  }

  private async submitRoomId(roomId: string): Promise<void> {
    this.html.hide();
    this.credentials.setRoomId(roomId);

    const room = await this.session.artichoke.getRoom(roomId);

    const conversationModule = new ConversationModule(makeDiv(), room, this.session);
  
    this.boardModule.addModule(conversationModule, true);
    this.boardModule.removeModule(this);
  }

  private render(): void {
    const input = makeInputWithBtn(
      Page.roomInputId,
      roomId => this.submitRoomId(roomId),
      'Connect to room', 'Room id...',
      this.credentials.getRoomId() || '',
    );

    this.html.append(input);
    Page.contents.empty();
    Page.contents.append(this.html);
  }
}
 */