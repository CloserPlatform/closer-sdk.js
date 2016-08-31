import { Artichoke } from "./artichoke";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { createMessage } from "./message";
import { ID, Message, Room as ProtoRoom, RoomAction, RosterRoom, Typing } from "./protocol";
import { wrapPromise } from "./utils";

class BaseRoom implements ProtoRoom {
    public id: ID;
    public name: string;
    public direct: boolean;

    private currMark: number;
    private log: Logger;
    private events: EventHandler;
    protected artichoke: Artichoke;

    constructor(room: RosterRoom, events: EventHandler, artichoke: Artichoke) {
        this.id = room.id;
        this.name = room.name;
        this.direct = room.direct;
        this.currMark = room.mark || 0;
        this.log = artichoke.log;
        this.events = events;
        this.artichoke = artichoke;
    }

    getHistory() {
        return this._wrapMessage(this.artichoke.rest.getChatHistory(this.id));
    }

    getUsers() {
        return this.artichoke.rest.getUsers(this.id);
    }

    getMark() {
        let _this = this;
        return new Promise(function(resolve, reject) {
            // NOTE No need to retrieve the mark if it's cached here.
            resolve(_this.currMark);
        });
    }

    send(message) {
        return this._wrapMessage(this.artichoke.socket.sendMessage(this.id, message));
    }

    mark(timestamp) {
        this.currMark = timestamp;
        return this.artichoke.socket.setMark(this.id, timestamp);
    }

    indicateTyping() {
        return this.artichoke.socket.sendTyping(this.id);
    }

    onMessage(callback: Callback<Message>) {
        // FIXME This ought to be a onContreceEvent() call.
        let _this = this;
        this.events.onEvent("message", function(msg: Message) {
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

    _wrapMessage(promise) {
        return wrapPromise(promise, createMessage, [this.events, this.artichoke]);
    }
}

class DirectRoom extends BaseRoom {}

class Room extends BaseRoom {
    join() {
        return this.artichoke.rest.joinRoom(this.id);
    }

    leave() {
        return this.artichoke.rest.leaveRoom(this.id);
    }

    invite(user) {
        return this.artichoke.rest.inviteToRoom(this.id, user);
    }
}

export function createRoom(room: ProtoRoom, events: EventHandler, artichoke: Artichoke): DirectRoom | Room {
    if (room.direct) {
        return new DirectRoom(room, events, artichoke);
    } else {
        return new Room(room, events, artichoke);
    }
}
