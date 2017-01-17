import { ArtichokeAPI, WheelHouseAPI } from "./api";
import { CreateRoomData } from "./campaign";
import { ResourceConfig } from "./config";
import { EventHandler } from "./events";
import { Logger } from "./logger";
import * as proto from "./protocol";
import { createRoom, DirectRoom, Room } from "./room";
import { wrapPromise } from "./utils";

export class WheelHouse {
  private wheelHouseAPI: WheelHouseAPI;
  private artichokeApi: ArtichokeAPI;
  private config: ResourceConfig;
  private log: Logger;
  private events: EventHandler;

  constructor(config: ResourceConfig, log: Logger, events: EventHandler,
              wheelHouseAPI: WheelHouseAPI, artichokeApi: ArtichokeAPI) {
    this.wheelHouseAPI = wheelHouseAPI;
    this.artichokeApi = artichokeApi;
    this.config = config;
    this.log = log;
    this.events = events;
  }

  // Campaigns API
  createRoom(createRoomData: CreateRoomData): Promise<Room | DirectRoom> {
    return this.wrapRoom(this.wheelHouseAPI.createRoom(createRoomData));
  }

  private wrapRoom(promise: Promise<proto.Room | Array<proto.Room>>) {
    return wrapPromise(promise, (room: proto.Room) => createRoom(room, this.log, this.events, this.artichokeApi));
  }
}
