import { Session } from './session';
import { ID, ApiKey } from '../protocol/protocol';
import { Artichoke } from '../artichoke/artichoke';
import { Spinner } from '../spinner/spinner';
import { Room } from '../rooms/room';

export class GuestSession extends Session {

    constructor(
        public readonly id: ID,
        public readonly apiKey: ApiKey,
        public readonly roomId: ID,
        public readonly orgId: ID,
        artichoke: Artichoke,
        spinner: Spinner,
    ) {
        super(id, apiKey, artichoke, spinner);
    }

    public async getRoom(): Promise<Room> {
        return this.artichoke.getRoom(this.roomId);
    }
}
