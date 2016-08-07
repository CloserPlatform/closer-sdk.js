// Chat room stuff.

class BaseRoom {
    constructor(room, artichoke) {
        this.id = room.id;
        this.name = room.name;
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
        return this.artichoke.socket.setMark(this.id, timestamp);
    }

    onMessage(callback) {
        this._defineCallback("message", callback);
    }

    onAction(callback) {
        this._defineCallback("room_action", callback);
    }

    _defineCallback(type, callback) {
        // FIXME It would be way better to store a hash of rooms and pick the relevant callback directly.
        let _this = this;
        this.artichoke.onMessage(type, function(msg) {
            if (msg.room === _this.id) {
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

export function createRoom(room, rest, ws) {
    if (room.direct) {
        return new DirectRoom(room, rest, ws);
    } else {
        return new Room(room, rest, ws);
    }
}
