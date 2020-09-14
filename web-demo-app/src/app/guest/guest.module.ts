import { makeDiv } from '../view';
import { Logger } from '../logger';
import { ConversationModule } from '../conversation/conversation.module';
import { CloserGuestSessionService } from '../conversation/closer-session.service';

export class GuestModule {

  constructor(
    private sessionService: CloserGuestSessionService
  ) {
  }

  public init(): void {
    this.initializeBoard().catch(err => Logger.error(err));
  }

  private async initializeBoard(): Promise<void> {
    this.sessionService.connect();
    const room = await this.sessionService.getRoom();
    const conversationModule = new ConversationModule(
      makeDiv(),
      this.sessionService,
      room,
    );

    conversationModule.init();
  }
}
