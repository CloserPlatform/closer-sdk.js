import * as wireEntities from '../protocol/wire-entities';
import { BusinessRoom } from './business-room';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { Room } from './room';
import { DirectRoom } from './direct-room';
import { GroupRoom } from './group-room';
import { LoggerFactory } from '../logger/logger-factory';

export class RoomFactory {

  constructor(private loggerFactory: LoggerFactory,
              private artichokeAPI: ArtichokeAPI) {}

  public create = (room: wireEntities.Room): Room => {
    if (room.direct) {
      return new DirectRoom(room, this.loggerFactory.create(`DirectRoom(${room.id})`), this.artichokeAPI);
    } else if (room.orgId) {
      return new BusinessRoom(room, this.loggerFactory.create(`BusinessRoom(${room.id})`), this.artichokeAPI);
    } else {
      return new GroupRoom(room, this.loggerFactory.create(`GroupRoom(${room.id})`), this.artichokeAPI);
    }
  }
}
