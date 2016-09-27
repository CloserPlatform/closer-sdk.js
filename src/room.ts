import { API } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { createMessage, Message } from "./message";
import * as proto from "./protocol";
import { wrapPromise } from "./utils";

class BaseRoom implements proto.Room {
    public id: proto.ID;
    public name: string;
    public created: proto.Timestamp;
    public users: Array<proto.ID>;
    public direct: boolean;
    public mark: proto.Timestamp;

    private log: Logger;
    protected events: EventHandler;
    protected api: API;

    constructor(room: proto.Room, log: Logger, events: EventHandler, api: API) {
        this.id = room.id;
        this.name = room.name;
        this.created = room.created;
        this.users = room.users;
        this.direct = room.direct;
        this.mark = room.mark || 0;
        this.log = log;
        this.events = events;
        this.api = api;
    }

    getHistory(): Promise<Array<Message>> {
        return this.wrapMessage(this.api.getRoomHistory(this.id));
    }

    getUsers(): Promise<Array<proto.ID>> {
        return this.api.getRoomUsers(this.id);
    }

    getMark(): Promise<number> {
        let _this = this;
        return new Promise(function(resolve, reject) {
            // NOTE No need to retrieve the mark if it's cached here.
            resolve(_this.mark);
        });
    }

    setMark(timestamp: proto.Timestamp) {
        this.mark = timestamp;
        this.api.setMark(this.id, timestamp);
    }

    send(message: string): Promise<Message> {
        return this.wrapMessage(this.api.sendMessage(this.id, message));
    }

    sendMetadata(payload: any): Promise<proto.Metadata> {
        return this.api.sendMetadata(this.id, payload);
    }

    indicateTyping() {
        this.api.sendTyping(this.id);
    }

    onMark(callback: Callback<proto.RoomMark>) {
        let _this = this;
        this.events.onConcreteEvent("room_mark", this.id, function(mark: proto.RoomMark) {
            _this.mark = mark.timestamp;
            callback(mark);
        });
    }

    onMessage(callback: Callback<proto.Message>) {
        this.events.onConcreteEvent("room_message", this.id, (msg: proto.RoomMessage) => callback(msg.message));
    }

    onMetadata(callback: Callback<proto.Metadata>) {
        this.events.onConcreteEvent("room_metadata", this.id, (msg: proto.RoomMetadata) => callback(msg.metadata));
    }

    onTyping(callback: Callback<proto.RoomTyping>) {
        this.events.onConcreteEvent("room_typing", this.id, callback);
    }

    private wrapMessage(promise: Promise<proto.Message | Array<proto.Message>>) {
        return wrapPromise(promise, (msg) => createMessage(msg, this.log, this.events, this.api));
    }
}

export class DirectRoom extends BaseRoom {}

export class Room extends BaseRoom {
    private onJoinedCallback: Callback<proto.Action>;
    private onLeftCallback: Callback<proto.Action>;
    private onInvitedCallback: Callback<proto.Action>;

    constructor(room: proto.Room, log: Logger, events: EventHandler, api: API) {
        super(room, log, events, api);

        let nop = (a: proto.Action) => {
            // Do nothing.
        };
        this.onLeftCallback = nop;
        this.onJoinedCallback = nop;
        this.onInvitedCallback = nop;

        let _this = this;
        this.events.onConcreteEvent("room_action", this.id, function(e: proto.RoomAction) {
            switch (e.action.action) {
            case "joined":
                _this.users.push(e.action.user);
                _this.onJoinedCallback(e.action);
                break;

            case "left":
                _this.users = _this.users.filter((u) => u !== e.action.user);
                _this.onLeftCallback(e.action);
                break;

            case "invited":
                _this.onInvitedCallback(e.action);
                break;

            default:
                _this.events.raise("Invalid room_action event", e);
            }
        });
    }

    getUsers(): Promise<Array<proto.ID>> {
        let _this = this;
        return new Promise(function(resolve, reject) {
            // NOTE No need to retrieve the list if it's cached here.
            resolve(_this.users);
        });
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

    onJoined(callback: Callback<proto.Action>) {
        this.onJoinedCallback = callback;
    }

    onLeft(callback: Callback<proto.Action>) {
        this.onLeftCallback = callback;
    }

    onInvited(callback: Callback<proto.Action>) {
        this.onInvitedCallback = callback;
    }
}

export function createRoom(room: proto.Room, log: Logger, events: EventHandler, api: API): DirectRoom | Room {
    if (room.direct) {
        return new DirectRoom(room, log, events, api);
    } else {
        return new Room(room, log, events, api);
    }
}
