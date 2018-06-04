import { errorEvents } from '../protocol/events/error-events';
import * as wireEntities from '../protocol/wire-entities';
import { roomEvents } from '../protocol/events/room-events';
import * as proto from '../protocol/protocol';
import { Logger } from '../logger';
import { Callback, EventHandler } from '../events/event-handler';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { Room } from './room';
import { RoomType } from './room-type';

export class GroupRoom extends Room {
    public readonly roomType: RoomType = RoomType.GROUP;

    private onJoinedCallback: Callback<roomEvents.Joined>;
    private onLeftCallback: Callback<roomEvents.Left>;
    private onInvitedCallback: Callback<roomEvents.Invited>;

    constructor(room: wireEntities.Room, log: Logger, events: EventHandler, api: ArtichokeAPI) {
        super(room, log, events, api);

        this.onLeftCallback = (e: roomEvents.Left) => { /* nothing */ };
        this.onJoinedCallback = (e: roomEvents.Joined) => { /* nothing */ };
        this.onInvitedCallback = (e: roomEvents.Invited) => { /* nothing */ };
    }

    public static isGroup(room: Room): room is GroupRoom {
        return room.roomType === RoomType.GROUP;
    }

    protected defineCallbacks() {
        this.events.onConcreteEvent(roomEvents.Joined.tag, this.id, this.uuid, (e: roomEvents.Joined) => {
            this.users.push(e.authorId);
            this.onJoinedCallback(e);
        });
        this.events.onConcreteEvent(roomEvents.Left.tag, this.id, this.uuid, (e: roomEvents.Left) => {
            this.users = this.users.filter((u) => u !== e.authorId);
            this.onLeftCallback(e);
        });
        this.events.onConcreteEvent(roomEvents.Invited.tag, this.id, this.uuid, (e: roomEvents.Invited) => {
            this.onInvitedCallback(e);
        });
        this.events.onConcreteEvent(roomEvents.MessageSent.tag, this.id, this.uuid, (e: roomEvents.MessageSent) => {
            this.onTextMessageCallback(e);
        });
        this.events.onConcreteEvent(roomEvents.CustomMessageSent.tag, this.id, this.uuid,
            (e: roomEvents.CustomMessageSent) => {
                if (e.subtag in this.onCustomCallbacks) {
                    this.onCustomCallbacks[e.subtag](e);
                } else {
                    this.events.notify(new errorEvents.Error('Unhandled custom message with subtag: : ' + e.subtag));
                }
            }
        );
    }

    getUsers(): Promise<Array<proto.ID>> {
        // NOTE No need to retrieve the list if it's cached here.
        return Promise.resolve(this.users);
    }

    join(): Promise<void> {
        return this.api.joinRoom(this.id);
    }

    leave(): Promise<void> {
        return this.api.leaveRoom(this.id);
    }

    invite(user: proto.ID): Promise<void> {
        return this.api.inviteToRoom(this.id, user);
    }

    onJoined(callback: Callback<roomEvents.Joined>) {
        this.onJoinedCallback = callback;
    }

    onLeft(callback: Callback<roomEvents.Left>) {
        this.onLeftCallback = callback;
    }

    onInvited(callback: Callback<roomEvents.Invited>) {
        this.onInvitedCallback = callback;
    }
}
