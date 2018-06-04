import { Room } from './room';
import { RoomType } from './room-type';

export class DirectRoom extends Room {
    public readonly roomType: RoomType = RoomType.DIRECT;

    public static isDirect(room: Room): room is DirectRoom {
        return room.roomType === RoomType.DIRECT;
    }
}
