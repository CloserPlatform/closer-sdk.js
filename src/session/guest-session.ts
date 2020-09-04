import { Session } from './session';
import { ID, ApiKey } from '../protocol/protocol';
import { Artichoke } from '../artichoke/artichoke';
import { Spinner } from '../spinner/spinner';

export class GuestSession extends Session {

    constructor(
        public readonly id: ID,
        public readonly apiKey: ApiKey,
        public readonly roomId: ID,
        public readonly orgId: ID,
        public readonly artichoke: Artichoke,
        public readonly spinner: Spinner,
    ) {
        super(id, apiKey, artichoke, spinner);
    }
}
