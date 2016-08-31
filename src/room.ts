import { API } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { createMessage, Message } from "./message";
import { ID, Message as MSG, Room as ProtoRoom, RoomAction, RosterRoom, Timestamp, Typing } from "./protocol";
import { wrapPromise } from "./utils";

class BaseRoom implements ProtoRoom {
    public id: ID;
    public name: string;
    public direct: boolean;

    private currMark: number;
    private log: Logger;
    private events: EventHandler;
    protected api: API;

    constructor(room: RosterRoom, log: Logger, events: EventHandler, api: API) {
        this.id = room.id;
        this.name = room.name;
        this.direct = room.direct;
        this.currMark = room.mark || 0;
        this.log = log;
        this.events = events;
        this.api = api;
    }

    getHistory(): Promise<Array<Message>> {
        return this.wrapMessage(this.api.getHistory(this.id));
    }

    getUsers(): Promise<Array<ID>> {
        return this.api.getUsers(this.id);
    }

    getMark(): Promise<number> {
        let _this = this;
        return new Promise(function(resolve, reject) {
            // NOTE No need to retrieve the mark if it's cached here.
            resolve(_this.currMark);
        });
    }

    send(message: string): Promise<Message> {
        return this.wrapMessage(this.api.sendMessage(this.id, message));
    }

    mark(timestamp: Timestamp) {
        this.currMark = timestamp;
        this.api.setMark(this.id, timestamp);
    }

    indicateTyping() {
        this.api.sendTyping(this.id);
    }

    onMessage(callback: Callback<MSG>) {
        // FIXME This ought to be a onContreceEvent() call.
        let _this = this;
        this.events.onEvent("message", function(msg: MSG) {
            if (msg.room === _this.id) {
                callback(msg);
            }
        });
    }

    onAction(callback: Callback<RoomAction>) {
        this.events.onConcreteEvent("room_action", this.id, callback);
    }

    onTyping(callback: Callback<Typing>) {
        this.events.onConcreteEvent("typing", this.id, callback);
    }

    private wrapMessage(promise: Promise<MSG | Array<MSG>>) {
        return wrapPromise(promise, (msg) => createMessage(msg, this.log, this.events, this.api));
    }
}

export class DirectRoom extends BaseRoom {}

export class Room extends BaseRoom {
    join(): Promise<void> {
        return this.api.joinRoom(this.id);
    }

    leave(): Promise<void> {
        return this.api.leaveRoom(this.id);
    }

    invite(user: ID): Promise<void> {
        return this.api.inviteToRoom(this.id, user);
    }
}

export function createRoom(room: ProtoRoom, log: Logger, events: EventHandler, api: API): DirectRoom | Room {
    if (room.direct) {
        return new DirectRoom(room, log, events, api);
    } else {
        return new Room(room, log, events, api);
    }
}
