// Chat room stuff.

class BaseRoom {
    constructor(room, artichoke) {
        this.id = room.id;
        this.name = room.name;
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
