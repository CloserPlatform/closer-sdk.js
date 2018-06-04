import { GroupRoom } from './group-room';
import { RoomType } from './room-type';

export class BusinessRoom extends GroupRoom {
    public readonly roomType: RoomType = RoomType.BUSINESS;
}
