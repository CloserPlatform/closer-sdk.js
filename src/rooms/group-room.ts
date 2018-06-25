import * as wireEntities from '../protocol/wire-entities';
import { roomEvents } from '../protocol/events/room-events';
import * as proto from '../protocol/protocol';
import { Logger } from '../logger';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { Room } from './room';
import { RoomType } from './room-type';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export class GroupRoom extends Room {
  public readonly roomType: RoomType = RoomType.GROUP;

  constructor(room: wireEntities.Room, log: Logger, api: ArtichokeAPI) {
    super(room, log, api);

    // FIXME - unsubscribe
    this.joined$.subscribe(joined => this.users = [...this.users, joined.authorId]);
    // FIXME - unsubscribe
    this.left$.subscribe(left => this.users = this.users.filter((u) => u !== left.authorId));
  }

  public static isGroup(room: Room): room is GroupRoom {
    return room.roomType === RoomType.GROUP;
  }

  public getUsers(): Promise<ReadonlyArray<proto.ID>> {
    // FIXME remove the cache
    // NOTE No need to retrieve the list if it's cached here.
    return Promise.resolve(this.users);
  }

  public join(): Promise<void> {
    return this.artichokeAPI.joinRoom(this.id);
  }

  public leave(): Promise<void> {
    return this.artichokeAPI.leaveRoom(this.id);
  }

  public invite(user: proto.ID): Promise<void> {
    return this.artichokeAPI.inviteToRoom(this.id, user);
  }

  public get joined$(): Observable<roomEvents.Joined> {
    return this.roomEvent.pipe(filter(roomEvents.Joined.isJoined));
  }

  public get left$(): Observable<roomEvents.Left> {
    return this.roomEvent.pipe(filter(roomEvents.Left.isLeft));
  }

  public get invited$(): Observable<roomEvents.Invited> {
    return this.roomEvent.pipe(filter(roomEvents.Invited.isInvited));
  }
}
