import { makeDiv } from '../view';
import { Logger } from '../logger';
import { ConversationModule } from '../conversation/conversation.module';
import { GuestSession } from '../../../../dist';
import { SessionService } from '../conversation/session.service';

export class GuestModule {

  constructor(
    private guestSession: GuestSession,
  ) {
  }

  public init(): void {
    this.initializeBoard().catch(err => Logger.error(err));
  }

  private async initializeBoard(): Promise<void> {
    const sessionService = new SessionService();
    sessionService.connect(this.guestSession);
    const room = await this.guestSession.artichoke.getRoom(this.guestSession.roomId);
    const conversationModule = new ConversationModule(
      makeDiv(),
      room,
      this.guestSession
    );

    conversationModule.init();
  }
}
