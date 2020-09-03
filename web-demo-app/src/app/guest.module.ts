import { makeInputWithBtn } from './view';
import { Page } from './page';
import { Logger } from './logger';
import { ConversationModule } from './conversation/conversation.module';
import { BoardModule } from './board/board.module';
import { CallModule } from './call/call.module';
import { Session, CloserSDK } from '../../../dist';
import { Credentials } from './credentials';

export class GuestModule {

  constructor(
    private html: JQuery,
  ) { }

  public init(closerSdk: CloserSDK, credentials: Credentials): void {

    if (credentials.isGuestSessionSaved()) {
      this.initializeExistingGuestSession(closerSdk, credentials);
    } else {
      this.renderInputs(closerSdk, credentials);
    }
  }

  private async initializeNewGuestSession(
    closerSdk: CloserSDK,
    credentials: Credentials,
    orgId: string,
  ): Promise<void> {
    const { guest, session } = await closerSdk.createGuestSession(orgId);
    credentials.setGuestCtx(guest.id, guest.orgId, guest.apiKey);

    return this.initializeBoard(session, guest.roomId);
  }

  private async initializeExistingGuestSession(closerSdk: CloserSDK, credentials: Credentials): Promise<void> {
    const { session, guest } = await closerSdk.getGuestSession(credentials.orgId, credentials.id, credentials.apiKey);

    return this.initializeBoard(session, guest.roomId);
  }

  private initializeBoard(session: Session, roomId: string): void {
    Page.contents.empty();
    const boardModule = new BoardModule(this.credentials, session, this.guestService.spinnerClient);
    const conversationModule = new ConversationModule(boardModule, this.credentials, roomId);
    const callModule = new CallModule(boardModule, this.credentials);

    boardModule.init([conversationModule, callModule], conversationModule);
  }

  private renderInputs(closerSdk: CloserSDK, credentials: Credentials): void {
    const orgInput = makeInputWithBtn(
      Page.orgInputId,
      orgId => this.initializeNewGuestSession(closerSdk, credentials, orgId),
      'Get org guest profile',
      'Org id...',
      'b4aea823-cf75-470c-8d0e-6e31407ade87'
    );

    this.html.append(orgInput);

    Page.contents.empty();
    Page.contents.append(this.html);
  }
}
