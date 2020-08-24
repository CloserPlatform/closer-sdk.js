import { SpinnerClient } from '@swagger/spinner';
import { Session } from '@closerplatform/closer-sdk';

export class BoardService {
  public session: Session;
  public spinnerClient: SpinnerClient;

  constructor (session: Session) {
    this.session = session;
  }

}
