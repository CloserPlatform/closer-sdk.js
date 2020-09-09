import { makeInputWithBtn, makeDiv } from './view';
import { Page } from './page';
import { Logger } from './logger';
import { ConversationModule } from './conversation/conversation.module';
import { BoardModule } from './board/board.module';
import { CallModule } from './call/call.module';
import { Session, CloserSDK } from '../../../dist';
import { Credentials, SessionDetails } from './credentials';
import { ID } from '../../../dist/protocol/protocol';

export class GuestModule {

  constructor(
    private html: JQuery,
    private closerSdk: CloserSDK,
    private credentials: Credentials,
  ) {
  }

  public init(): void {
    const maybeSession = this.credentials.getSession();
    const maybeOrgId = this.credentials.getOrgId();

    if (maybeSession && maybeOrgId) {
      this.initializeExistingGuestSession(this.closerSdk, maybeOrgId, maybeSession).catch(err => Logger.error(err));
    } else {
      this.renderInputs(this.closerSdk, this.credentials);
    }
  }

  private async initializeNewGuestSession(
    closerSdk: CloserSDK,
    credentials: Credentials,
    orgId: string,
  ): Promise<void> {
    const session = await closerSdk.createGuestSession(orgId);
    const { id, apiKey } = session;
    credentials.setRoomId(session.roomId);
    credentials.setSession({ id, apiKey, isGuest: true });

    return this.initializeBoard(session, session.roomId);
  }

  private async initializeExistingGuestSession(
    closerSdk: CloserSDK,
    orgId: ID,
    sessionDetails: SessionDetails,
  ): Promise<void> {
    const session = await closerSdk.getGuestSession(orgId, sessionDetails.id, sessionDetails.apiKey);

    return this.initializeBoard(session, session.roomId);
  }

  private async initializeBoard(session: Session, roomId: string): Promise<void> {
    Page.contents.empty();
    const room = await session.artichoke.getRoom(roomId);
    const conversationModule = new ConversationModule(makeDiv(), room, session);
    const callModule = new CallModule(session);
    const boardModule = new BoardModule(conversationModule, callModule, session);

    return boardModule.init();
  }

  private renderInputs(closerSdk: CloserSDK, credentials: Credentials): void {
    const orgInput = makeInputWithBtn(
      Page.orgInputId,
      orgId => this.initializeNewGuestSession(closerSdk, credentials, orgId),
      'Get org guest profile',
      'Org id...',
      credentials.getOrgId() || 'b4aea823-cf75-470c-8d0e-6e31407ade87'
    );

    this.html.append(orgInput);

    Page.contents.empty();
    Page.contents.append(this.html);
  }
}
