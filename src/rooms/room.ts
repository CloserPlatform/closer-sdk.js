import { chatEvents } from '../protocol/events/chat-events';
import { roomEvents } from '../protocol/events/room-events';
import * as proto from '../protocol/protocol';
import * as wireEntities from '../protocol/wire-entities';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { RoomType } from './room-type';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LoggerService } from '../logger/logger-service';

export abstract class Room implements wireEntities.Room {
    private static defaultRoomCount = 100;
    public abstract readonly roomType: RoomType;
    public readonly id: proto.ID;
    public readonly name: string;
    public readonly created: proto.Timestamp;
    public readonly direct: boolean;
    public users: ReadonlyArray<proto.ID> = [];
    public orgId?: proto.ID;
    public marks: { [type: string]: proto.Timestamp } = {};

    protected roomEvent = new Subject<roomEvents.RoomEvent>();

    constructor(room: wireEntities.Room, logger: LoggerService, protected artichokeAPI: ArtichokeAPI) {
        this.id = room.id;
        this.name = room.name;
        this.created = room.created;
        this.users = room.users;
        this.direct = room.direct;
        this.orgId = room.orgId;
        this.marks = room.marks;

        // FIXME - unsubscribe
        this.artichokeAPI.event$
          .pipe(filter(roomEvents.RoomEvent.isRoomEvent))
          .pipe(filter(ev => ev.roomId === this.id))
          .subscribe(ev => this.roomEvent.next(ev));

        // FIXME - unsubscribe
        this.marked$.subscribe(mark => this.marks[mark.authorId] = mark.timestamp);

        logger.debug(`Room: initialized ${this.id}`);
    }

    public getLatestMessages(count?: number,
                             historyFilter?: proto.HistoryFilter): Promise<proto.Paginated<roomEvents.RoomEvent>> {
        return this.doGetHistory(
          this.artichokeAPI.getRoomHistoryLast(this.id, count || Room.defaultRoomCount, historyFilter));
    }

    public getMessages(offset: number, limit: number,
                       historyFilter?: proto.HistoryFilter): Promise<proto.Paginated<roomEvents.RoomEvent>> {
        return this.doGetHistory(this.artichokeAPI.getRoomHistoryPage(this.id, offset, limit, historyFilter));
    }

    public getUsers(): Promise<ReadonlyArray<proto.ID>> {
        return this.artichokeAPI.getRoomUsers(this.id);
    }

    public getMark(user: proto.ID): Promise<number> {
        // NOTE No need to retrieve the list if it's cached here.
        return Promise.resolve((this.marks && this.marks[user]) || 0);
    }

    public setMark(timestamp: proto.Timestamp): Promise<void> {
        if (!this.marks) {
            this.marks = {};
        }
        this.marks[this.artichokeAPI.sessionId] = timestamp;

        return this.artichokeAPI.setMark(this.id, timestamp);
    }

    public setDelivered(messageId: proto.ID): Promise<void> {
        return this.artichokeAPI.setDelivered(this.id, messageId, Date.now());
    }

    public send(message: string, context?: proto.Context): Promise<chatEvents.Received> {
        return this.artichokeAPI.sendMessage(this.id, message, context);
    }

    public sendCustom(message: string, subtag: string, context: proto.Context): Promise<chatEvents.Received> {
        return this.artichokeAPI.sendCustom(this.id, message, subtag, context);
    }

    public indicateTyping(): Promise<void> {
        return this.artichokeAPI.sendTyping(this.id);
    }

    public get marked$(): Observable<roomEvents.MarkSent> {
        return this.roomEvent.pipe(filter(roomEvents.MarkSent.isMarkSent));
    }

    public get message$(): Observable<roomEvents.MessageSent> {
        return this.roomEvent.pipe(filter(roomEvents.MessageSent.isMessageSent));
    }

    public get messageDelivered$(): Observable<roomEvents.MessageDelivered> {
        return this.roomEvent.pipe(filter(roomEvents.MessageDelivered.isMessageDelivered));
    }

    public get customMessage$(): Observable<roomEvents.CustomMessageSent> {
        return this.roomEvent.pipe(filter(roomEvents.CustomMessageSent.isCustomMessageSent));
    }

    public get typing$(): Observable<roomEvents.TypingSent> {
        return this.roomEvent.pipe(filter(roomEvents.TypingSent.isTypingSent));
    }

    public getCustomMessageStream(subtag: string): Observable<roomEvents.CustomMessageSent> {
      return this.customMessage$.pipe(filter(ev => ev.subtag === subtag));
    }

    private doGetHistory(p: Promise<proto.Paginated<roomEvents.RoomEvent>>):
    Promise<proto.Paginated<roomEvents.RoomEvent>> {
        return this.wrapPagination(p, (m: roomEvents.RoomEvent) => m);
    }

    private wrapPagination<T, U>(p: Promise<proto.Paginated<T>>, f: (arg: T) => U):
    Promise<proto.Paginated<U>> {
        return p.then((t) =>
            ({
                offset: t.offset,
                limit: t.limit,
                items: t.items.map(f)
            }));
    }
}
