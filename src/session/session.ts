import { Artichoke } from '../artichoke/artichoke';
import { ID } from '../protocol/protocol';

export class Session {

  constructor(
    public readonly id: ID,
    public readonly artichoke: Artichoke
    ) {
  }
}
