// Chat room stuff.

class BaseRoom {
    constructor(room, rest, ws) {
        this.id = room.id;
        this.name = room.name;
        this.rest = rest;
        this.socket = ws;
    }

    getHistory() {
        return this.rest.getChatHistory(this.id);
    }

    getUsers() {
        return this.rest.getUsers(this.id);
    }

    send(message) {
        return this.socket.sendMessage(this.id, message);
    }
}

export class DirectRoom extends BaseRoom {}

export class Room extends BaseRoom {
    join() {
        return this.rest.joinRoom(this.id);
    }

    leave() {
        return this.rest.leaveRoom(this.id);
    }

    invite(user) {
        return this.rest.inviteToRoom(this.id, user);
    }
}

export function createRoom(room, rest, ws) {
    if (room.direct) {
        return new DirectRoom(room, rest, ws);
    } else {
        return new Room(room, rest, ws);
    }
}
