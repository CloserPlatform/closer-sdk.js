import { Callback, EventHandler } from '../events/event-handler';
import { Logger } from '../logger';
import { chatEvents } from '../protocol/events/chat-events';
import { errorEvents } from '../protocol/events/error-events';
import { roomEvents } from '../protocol/events/room-events';
import { ID, Paginated } from '../protocol/protocol';
// tslint:disable-next-line:no-duplicate-imports
import * as proto from '../protocol/protocol';
import * as wireEntities from '../protocol/wire-entities';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { RoomType } from './room-type';
import RoomEvent = roomEvents.RoomEvent;
import { RandomUtils, UUID } from '../utils/random-utils';

export abstract class Room implements wireEntities.Room {

    public id: proto.ID;
    public name: string;
    public created: proto.Timestamp;
    public users: Array<proto.ID>;
    public direct: boolean;
    public orgId?: proto.ID;
    public marks: { [type: string]: proto.Timestamp };

    public abstract readonly roomType: RoomType;
    protected readonly uuid: UUID = RandomUtils.randomUUID();
    protected events: EventHandler;
    protected api: ArtichokeAPI;

    protected onTextMessageCallback: Callback<roomEvents.MessageSent>;
    protected onCustomCallbacks: { [tag: string]: Callback<roomEvents.CustomMessageSent> };

    private log: Logger;

    constructor(room: wireEntities.Room, log: Logger, events: EventHandler, api: ArtichokeAPI) {
        this.id = room.id;
        this.name = room.name;
        this.created = room.created;
        this.users = room.users;
        this.direct = room.direct;
        this.orgId = room.orgId;
        this.marks = room.marks;
        this.log = log;
        this.events = events;
        this.api = api;
        this.onCustomCallbacks = {};
        this.onTextMessageCallback = (_m: roomEvents.MessageSent): void => {
            // Do nothing.
          this.log.warn('Empty onTextMessageCallback called');
        };
        this.defineCallbacks();
    }

    public getLatestMessages(count?: number, filter?: proto.HistoryFilter):
    Promise<proto.Paginated<roomEvents.RoomEvent>> {
        return this.doGetHistory(this.api.getRoomHistoryLast(this.id, count || 100, filter));
    }

    public getMessages(offset: number, limit: number,
                       filter?: proto.HistoryFilter): Promise<proto.Paginated<roomEvents.RoomEvent>> {
        return this.doGetHistory(this.api.getRoomHistoryPage(this.id, offset, limit, filter));
    }

    public getUsers(): Promise<Array<proto.ID>> {
        return this.api.getRoomUsers(this.id);
    }

    public getMark(user: ID): Promise<number> {
        // NOTE No need to retrieve the list if it's cached here.
        return Promise.resolve((this.marks && this.marks[user]) || 0);
    }

    public setMark(timestamp: proto.Timestamp): Promise<void> {
        if (!this.marks) {
            this.marks = {};
        }
        this.marks[this.api.sessionId] = timestamp;

        return this.api.setMark(this.id, timestamp);
    }

    public setDelivered(messageId: proto.ID): Promise<void> {
        return this.api.setDelivered(this.id, messageId, Date.now());
    }

    public send(message: string): Promise<chatEvents.Received> {
        return this.api.sendMessage(this.id, message);
    }

    public sendCustom(message: string, subtag: string, context: proto.Context): Promise<chatEvents.Received> {
        return this.api.sendCustom(this.id, message, subtag, context);
    }

    public indicateTyping(): Promise<void> {
        return this.api.sendTyping(this.id);
    }

    public onMarked(callback: Callback<roomEvents.MarkSent>): void {
        this.events.onConcreteEvent(roomEvents.MarkSent.tag, this.id, this.uuid, (mark: roomEvents.MarkSent) => {
            if (!this.marks) {
                this.marks = {};
            }
            this.marks[mark.authorId] = mark.timestamp;
            callback(mark);
        });
    }

    public onMessage(callback: Callback<roomEvents.MessageSent>): void {
        this.onTextMessageCallback = callback;
    }

    public onMessageDelivered(callback: Callback<roomEvents.MessageDelivered>): void {
        this.events.onConcreteEvent(roomEvents.MessageDelivered.tag, this.id, this.uuid, callback);
    }

    public onCustom(subtag: string, callback: Callback<roomEvents.CustomMessageSent>): void {
        this.onCustomCallbacks[subtag] = callback;
    }

    public onTyping(callback: Callback<roomEvents.TypingSent>): void {
        this.events.onConcreteEvent(roomEvents.TypingSent.tag, this.id, this.uuid, callback);
    }

    protected defineCallbacks(): void {
        this.events.onConcreteEvent(roomEvents.MessageSent.tag, this.id, this.uuid, (e: roomEvents.MessageSent) => {
            this.onTextMessageCallback(e);
        });
        this.events.onConcreteEvent(roomEvents.CustomMessageSent.tag, this.id, this.uuid,
            (e: roomEvents.CustomMessageSent) => {
                if (e.subtag in this.onCustomCallbacks) {
                    this.onCustomCallbacks[e.subtag](e);
                } else {
                    this.events.notify(new errorEvents.Error(`Unhandled custom message with subtag: : ${e.subtag}`));
                }
            }
        );
    }

    private doGetHistory(p: Promise<proto.Paginated<roomEvents.RoomEvent>>): Promise<Paginated<RoomEvent>> {
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
