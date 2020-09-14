import { Artichoke } from '../artichoke/artichoke';
import { ID, ApiKey } from '../protocol/protocol';
import { Spinner } from '../spinner/spinner';
import { Observable } from 'rxjs';
import { serverEvents } from '../protocol/events/server-events';
import { Call } from '../calls/call';

export class Session {

  constructor(
    public readonly id: ID,
    public readonly apiKey: ApiKey,
    public readonly artichoke: Artichoke,
    public readonly spinner: Spinner,
  ) {
  }

  public get connection$(): Observable<serverEvents.Hello> {
    return this.artichoke.connection$;
  }

  public get serverUnreachable$(): Observable<void> {
    return this.artichoke.serverUnreachable$;
  }

  public async createCall(invitee: ID): Promise<Call> {
    const callEvent = await this.spinner.createCall({ invitee });

    return this.getCall(callEvent.id);
  }

  public async getCall(callId: ID): Promise<Call> {
    return this.artichoke.getCall(callId);
  }
}
