import { Artichoke } from '../artichoke/artichoke';
import { ID } from '../protocol/protocol';
import { Spinner } from '../spinner/spinner';

export class Session {

  constructor(
    public readonly id: ID,
    public readonly artichoke: Artichoke,
    public readonly spinner: Spinner,
    ) {
  }
}
