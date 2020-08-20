import * as RatelSdk from '../../../';
import { SpinnerClient, LeadCtx, SignUpGuest, GuestProfile } from '@swagger/spinner';
import { SessionService } from '../board/session.service';
import { Credentials } from '../credentials';

export interface NewConnnect {
  session: RatelSdk.Session;
  leadCtx: LeadCtx;
}

export interface ExistingConnect {
  session: RatelSdk.Session;
  roomId: string;
}

export class GuestService {
  private static readonly successStatusCode = 200;

  public session: RatelSdk.Session;
  public spinnerClient: SpinnerClient;
  private sessionService: SessionService;

  constructor (sc: SpinnerClient) {
    this.sessionService = new SessionService();
    this.spinnerClient = sc;
  }

  public getExistingGuestSession = async (credentials: Credentials): Promise<ExistingConnect> => {
    const guestProfile = await this.spinnerClient.getGuestProfile(credentials.orgId, credentials.id);

    const authCtx = {
      id: credentials.id,
      apiKey: credentials.apiKey
    };

    const session = await this.sessionService.connect(authCtx, credentials.artichokeServer, credentials.authServer);
    this.session = session;

    return {session, roomId: guestProfile.roomId};
  }

  public getNewGuestSession = async (orgId: string, credentials: Credentials): Promise<NewConnnect> => {
    const signUpArgs: SignUpGuest.Args = { orgId };
    const body: SignUpGuest = new SignUpGuest(signUpArgs);

    const leadCtx = await this.spinnerClient.signUpGuest(body);
    const session = await this.sessionService.connect(leadCtx,
      credentials.artichokeServer, credentials.authServer);

    this.session = session;

    return {leadCtx, session};
  }
}
