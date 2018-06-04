import { BusinessRoom } from './business-room';
import * as wireEntities from '../protocol/wire-entities';
import { GroupRoom } from './group-room';
import { Room } from './room';
import { Logger } from '../logger';
import { EventHandler } from '../events/event-handler';
import { DirectRoom } from './direct-room';
import { ArtichokeAPI } from '../apis/artichoke-api';

export function createRoom(room: wireEntities.Room, log: Logger, events: EventHandler, api: ArtichokeAPI): Room {
    if (room.direct) {
        return new DirectRoom(room, log, events, api);
    } else if (room.orgId) {
        return new BusinessRoom(room, log, events, api);
    } else {
        return new GroupRoom(room, log, events, api);
    }
}
