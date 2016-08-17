// Chat room stuff.

class BaseRoom {
    constructor(room, artichoke) {
        this.id = room.id;
        this.name = room.name;
        this.currMark = room.mark;
        this.direct = room.direct;
        this.log = artichoke.log;
        this.artichoke = artichoke;
    }

    getHistory() {
        return this.artichoke.rest.getChatHistory(this.id);
    }

    getUsers() {
        return this.artichoke.rest.getUsers(this.id);
    }

    send(message) {
        return this.artichoke.socket.sendMessage(this.id, message);
    }

    mark(timestamp) {
        this.currMark = timestamp;
        return this.artichoke.socket.setMark(this.id, timestamp);
    }

    indicateTyping() {
        return this.artichoke.socket.sendTyping(this.id);
    }

    onMessage(callback) {
        this._defineCallback("message", callback);
    }

    onAction(callback) {
        this._defineCallback("room_action", callback);
    }

    onTyping(callback) {
        this._defineCallback("typing", callback);
    }

    _defineCallback(type, callback) {
        // FIXME It would be way better to store a hash of rooms and pick the relevant callback directly.
        let _this = this;
        this.artichoke.onEvent(type, function(msg) {
            if (msg.room === _this.id || msg.id === _this.id) {
                _this.log("Running callback " + type + " for room: " + _this.id);
                callback(msg);
            }
        });
    }
}

export class DirectRoom extends BaseRoom {}

export class Room extends BaseRoom {
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

export function createRoom(room, artichoke) {
    if (room.direct) {
        return new DirectRoom(room, artichoke);
    } else {
        return new Room(room, artichoke);
    }
}
