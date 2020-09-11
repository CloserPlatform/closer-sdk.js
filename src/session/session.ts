import { Artichoke } from '../artichoke/artichoke';
import { ID, ApiKey } from '../protocol/protocol';
import { Spinner } from '../spinner/spinner';

export class Session {

  constructor(
    public readonly id: ID,
    public readonly apiKey: ApiKey,
    public readonly artichoke: Artichoke,
    public readonly spinner: Spinner,
    ) {
  }
}
