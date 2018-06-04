import { GroupRoom } from './group-room';
import { RoomType } from './room-type';
import { Room } from './room';

export class BusinessRoom extends GroupRoom {
    public readonly roomType: RoomType = RoomType.BUSINESS;

    public static isBusiness(room: Room): room is BusinessRoom {
        return room.roomType === RoomType.BUSINESS;
    }
}
