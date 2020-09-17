import { chatEvents } from '../protocol/events/chat-events';
import { roomEvents } from '../protocol/events/room-events';
import * as proto from '../protocol/protocol';
import * as wireEntities from '../protocol/wire-entities';
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { RoomType } from './room-type';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LoggerService } from '../logger/logger-service';

export abstract class Room implements wireEntities.Room {
    public static readonly defaultRoomCount = 20;
    public abstract readonly roomType: RoomType;
    public readonly id: proto.ID;
    public readonly name: string;
    public readonly created: proto.Timestamp;
    public readonly direct: boolean;
    // tslint:disable-next-line:readonly-keyword
    public users: ReadonlyArray<proto.ID> = [];
    public readonly orgId?: proto.ID;
    // tslint:disable-next-line:readonly-keyword
    public marks: { [type: string]: proto.Timestamp } = {};

    public async getLatestMessages(
        count?: number,
        historyFilter?: proto.HistoryFilter,
    ): Promise<proto.Paginated<roomEvents.RoomEvent>> {
        return this.artichokeAPI.getRoomHistoryLast(this.id, count || Room.defaultRoomCount, historyFilter);
    }

    public async getMessages(
        offset: number,
        limit: number,
        historyFilter?: proto.HistoryFilter,
    ): Promise<proto.Paginated<roomEvents.RoomEvent>> {
        return this.artichokeAPI.getRoomHistoryPage(this.id, offset, limit, historyFilter);
    }

    public async getUsers(): Promise<ReadonlyArray<proto.ID>> {
        return this.artichokeAPI.getRoomUsers(this.id);
    }

    public getCachedMark(user: proto.ID): number {
        return (this.marks && this.marks[user]) || 0;
    }

    public setMark(timestamp: proto.Timestamp): void {
        if (!this.marks) {
            this.marks = {};
        }
        this.marks[this.artichokeAPI.sessionId] = timestamp;

        return this.artichokeAPI.setMark(this.id, timestamp);
    }

    public setDelivered(messageId: proto.ID): void {
        return this.artichokeAPI.setDelivered(this.id, messageId, Date.now());
    }

    public send(message: string, context?: proto.Context): Observable<chatEvents.Received> {
        return this.artichokeAPI.sendMessage(this.id, message, context);
    }

    public sendCustom(message: string, subtag: string, context: proto.Context): Observable<chatEvents.Received> {
        return this.artichokeAPI.sendCustom(this.id, message, subtag, context);
    }

    public indicateTyping(preview?: string): void {
        return this.artichokeAPI.sendTyping(this.id, preview);
    }

    public get marked$(): Observable<roomEvents.MarkSent> {
        return this.roomEvent$.pipe(filter(roomEvents.MarkSent.isMarkSent));
    }

    public get message$(): Observable<roomEvents.MessageSent> {
        return this.roomEvent$.pipe(filter(roomEvents.MessageSent.isMessageSent));
    }

    public get messageUpdated$(): Observable<roomEvents.MessageUpdated> {
        return this.roomEvent$.pipe(filter(roomEvents.MessageUpdated.isMessageUpdated));
    }

    public get messageDelivered$(): Observable<roomEvents.MessageDelivered> {
        return this.roomEvent$.pipe(filter(roomEvents.MessageDelivered.isMessageDelivered));
    }

    public get customMessage$(): Observable<roomEvents.CustomMessageSent> {
        return this.roomEvent$.pipe(filter(roomEvents.CustomMessageSent.isCustomMessageSent));
    }

    public get typing$(): Observable<roomEvents.TypingSent> {
        return this.roomEvent$.pipe(filter(roomEvents.TypingSent.isTypingSent));
    }

    public customSubtagMessage$(subtag: string): Observable<roomEvents.CustomMessageSent> {
        return this.customMessage$.pipe(filter(ev => ev.subtag === subtag));
    }

    protected get roomEvent$(): Observable<roomEvents.RoomEvent> {
        return this.artichokeAPI.domainEvent$.pipe(
          filter(roomEvents.RoomEvent.isRoomEvent),
          filter(ev => ev.roomId === this.id),
        );
    }

    protected constructor(
        room: wireEntities.Room,
        logger: LoggerService,
        protected artichokeAPI: ArtichokeApi,
    ) {
        this.id = room.id;
        this.name = room.name;
        this.created = room.created;
        this.users = room.users;
        this.direct = room.direct;
        this.orgId = room.orgId;
        this.marks = room.marks;

        // FIXME - unsubscribe
        this.marked$.subscribe(mark => this.marks[mark.authorId] = mark.timestamp);

        logger.debug(`Room: initialized ${this.id}`);
    }
}
