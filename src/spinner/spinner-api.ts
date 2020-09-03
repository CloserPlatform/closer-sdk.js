import { HttpClient } from '../http/http-client';
import { CreateCall, Call, LeadCtx, SignUpGuest, GuestProfile, AgentCtx, LoginForm, LoginWithTokenForm } from './protocol';
import { ApiKey } from '../protocol/protocol';

export class SpinnerApi {

  constructor(
    private httpClient: HttpClient,
    ) {
  }

  public setApiKey(apiKey: ApiKey): void {
    this.httpClient.setApiKey(apiKey);
  }

  public async getGuestProfile(orgId: string, id: string): Promise<GuestProfile> {
      return this.httpClient.get(`users/guest/${id}/${orgId}`);
  }

  public async signUpGuest(body: SignUpGuest): Promise<LeadCtx> {
    return this.httpClient.post('users/guest', body);
  }

  /**
   * It requires deviceId to be set
   * @param body CreateCall
   */
  public async createCall(body: CreateCall): Promise<Call> {
    return this.httpClient.post('calls/create', body);
  }

  // Agent API
  public async login(body: LoginForm | LoginWithTokenForm): Promise<AgentCtx> {
    return this.httpClient.post('session', body);
  }

  public async getSession(): Promise<AgentCtx> {
    return this.httpClient.get('session');
  }
}
