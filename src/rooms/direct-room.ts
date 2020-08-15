import { Room } from './room';
import { RoomType } from './room-type';
import { Room as WireRoom } from '../protocol/wire-entities';
import { LoggerService } from '../logger/logger-service';
import { ArtichokeApi } from '../artichoke/artichoke-api';

export class DirectRoom extends Room {
    public readonly roomType: RoomType = RoomType.DIRECT;

    constructor(
        room: WireRoom,
        logger: LoggerService,
        api: ArtichokeApi,
    ) {
        super(room, logger, api);
    }

    public static isDirect(room: Room): room is DirectRoom {
        return room.roomType === RoomType.DIRECT;
    }
}
