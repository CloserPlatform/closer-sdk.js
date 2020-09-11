import { makeInputWithBtn, makeDiv } from './view';
import { Page } from './page';
import { Logger } from './logger';
import { ConversationModule } from './conversation/conversation.module';
import { CallModule } from './call/call.module';
import { CloserSDK, GuestSession } from '../../../dist';
import { Credentials, SessionDetails } from './credentials';
import { ID } from '../../../dist/protocol/protocol';
import { SessionService } from './session.service';

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

  private async submitOrgId(
    closerSdk: CloserSDK,
    credentials: Credentials,
    orgId: string,
  ): Promise<void> {
    credentials.setOrgId(orgId);
    closerSdk.createGuestSession(orgId).then(
      session => {
        const { id, apiKey, roomId } = session;
        credentials.setRoomId(roomId);
        credentials.setSession({ id, apiKey, isGuest: true });

        this.initializeBoard(session);
      },
      _ => alert('Could not create guest session, check orgId.')
    )
  }

  private async initializeExistingGuestSession(
    closerSdk: CloserSDK,
    orgId: ID,
    sessionDetails: SessionDetails,
  ): Promise<void> {
    const session = await closerSdk.getGuestSession(orgId, sessionDetails.id, sessionDetails.apiKey);

    return this.initializeBoard(session);
  }

  private async initializeBoard(session: GuestSession): Promise<void> {
    const sessionService = new SessionService();
    sessionService.connect(session);
    Page.contents.empty();
    const room = await session.artichoke.getRoom(session.roomId);
    const conversationModule = new ConversationModule(makeDiv(), room, session);
    const callModule = new CallModule(session);

    conversationModule.init();
    callModule.init();
    callModule.hide();
  }

  private renderInputs(closerSdk: CloserSDK, credentials: Credentials): void {
    const orgInput = makeInputWithBtn(
      Page.orgInputId,
      orgId => this.submitOrgId(closerSdk, credentials, orgId),
      'Get org guest profile',
      'Org id...',
      credentials.getOrgId() || '30302126-5a04-465c-b074-2628a35dfe43'
    );

    this.html.append(orgInput);

    Page.contents.empty();
    Page.contents.append(this.html);
  }
}
