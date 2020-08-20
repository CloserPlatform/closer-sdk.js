// tslint:disable:no-any

import * as RatelSdk from '../../../';
import { SpinnerClient, LeadCtx, SignUpGuest } from '@swagger/spinner';
import { SessionService } from '../board/session.service';
import { Credentials } from '../credentials';

export interface GuestConnect {
  session: RatelSdk.Session;
  leadCtx: LeadCtx;
}

export class GuestService {
  private static readonly successStatusCode = 200;

  public session: RatelSdk.Session;
  private spinnerClient: SpinnerClient;
  private sessionService: SessionService;

  constructor (credentials: Credentials, sc: SpinnerClient) {
    this.sessionService = new SessionService();
    this.spinnerClient = sc;
  }

  public connectGuest = async (orgId: string, credentials: Credentials): Promise<GuestConnect> => {
    const signUpArgs: SignUpGuest.Args = { orgId };
    const body: SignUpGuest = new SignUpGuest(signUpArgs);

    const leadCtx = await this.spinnerClient.signUpGuest(body);
    const session = await this.sessionService.connect(leadCtx,
      credentials.artichokeServer, credentials.authServer);

    this.session = session;

    return {leadCtx, session};
  }
}
