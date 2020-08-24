import { SpinnerClient } from '@swagger/spinner';
import { Session } from '@closerplatform/closer-sdk';

export class BoardService {
  constructor (public session: Session, public spinnerClient: SpinnerClient) { }
}
