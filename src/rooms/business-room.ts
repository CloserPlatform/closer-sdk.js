import { GroupRoom } from './group-room';
import { RoomType } from './room-type';
import { Room as WireRoom } from '../protocol/wire-entities';
import { Room } from './room';
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { LoggerService } from '../logger/logger-service';

export class BusinessRoom extends GroupRoom {
    public readonly roomType: RoomType = RoomType.BUSINESS;

    constructor(
        room: WireRoom,
        logger: LoggerService,
        api: ArtichokeApi,
    ) {
        super(room, logger, api);
    }

    public static isBusiness(room: Room): room is BusinessRoom {
        return room.roomType === RoomType.BUSINESS;
    }
}
