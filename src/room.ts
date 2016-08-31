import { Artichoke } from "./artichoke";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { createMessage } from "./message";
import { Event, ID, Message, Room as ProtoRoom, RoomAction, RosterRoom, Type as EventType, Typing } from "./protocol";
import { wrapPromise } from "./utils";

class BaseRoom implements ProtoRoom {
    public id: ID;
    public name: string;
    public direct: boolean;

    private currMark: number;
    private log: Logger;
    protected artichoke: Artichoke;

    constructor(room: RosterRoom, events: EventHandler, artichoke: Artichoke) {
        this.id = room.id;
        this.name = room.name;
        this.direct = room.direct;
        this.currMark = room.mark || 0;
        this.log = artichoke.log;
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
        this._defineCallback("message", callback);
    }

    onAction(callback: Callback<RoomAction>) {
        this._defineCallback("room_action", callback);
    }

    onTyping(callback: Callback<Typing>) {
        this._defineCallback("typing", callback);
    }

    _wrapMessage(promise) {
        return wrapPromise(promise, createMessage, [this.artichoke]);
    }

    _defineCallback(type: EventType, callback: Callback<Event>) {
        // FIXME It would be way better to store a hash of rooms and pick the relevant callback directly.
        let _this = this;
        this.artichoke.onEvent(type, function(msg) {
            let id: ID = undefined;
            if (msg.type === "message") {
                id = (msg as Message).room;
            } else {
                id = msg.id;
            }
            if (id === _this.id) {
                _this.log("Running callback " + type + " for room: " + _this.id);
                callback(msg);
            }
        });
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
