import * as wireEntities from '../protocol/wire-entities';
import { Logger } from '../logger';
import { BusinessRoom } from './business-room';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { Room } from './room';
import { DirectRoom } from './direct-room';
import { GroupRoom } from './group-room';

export class RoomFactory {

  constructor(private logger: Logger, private artichokeAPI: ArtichokeAPI) {}

  public create = (room: wireEntities.Room): Room => {
    if (room.direct) {
      return new DirectRoom(room, this.logger, this.artichokeAPI);
    } else if (room.orgId) {
      return new BusinessRoom(room, this.logger, this.artichokeAPI);
    } else {
      return new GroupRoom(room, this.logger, this.artichokeAPI);
    }
  }
}
