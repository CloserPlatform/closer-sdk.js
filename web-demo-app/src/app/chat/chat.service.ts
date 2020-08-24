import { Session } from '@closerplatform/closer-sdk';
import { SpinnerClient } from '@swagger/spinner';

export class ChatService {
  constructor(public session: Session, public spinnerClient: SpinnerClient) { }
}
