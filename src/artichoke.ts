import { API } from "./api";
import { createCall } from "./call";
import { Config } from "./config";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { createMessage } from "./message";
import { CallInvitation, Error, Event, Message, Presence, RoomCreated } from "./protocol";
import { createRoom } from "./room";
import { nop, wrapPromise } from "./utils";

export class Artichoke {
    private api: API;
    private config: Config;
    private log: Logger;
    private events: EventHandler;

    constructor(config: Config, log: Logger, eh: EventHandler) {
        this.config = config;
        this.log = log;
        this.events = eh;

        // NOTE By default do nothing.
        this.events.onEvent("error", nop);
        this.events.onEvent("msg_received", nop);
        this.events.onEvent("msg_delivered", nop);
    }

    // Callbacks:
    onConnect(callback: Callback<Event>) {
        this.events.onEvent("hello", callback);
    }

    onError(callback: Callback<Error>) {
        this.events.onError(callback);
    }

    // API:
    connect() {
        this.api = new API(this.config, this.log);

        let _this = this;
        this.api.onEvent(function(e: Event) {
            // FIXME Adjust format on the backend.
            switch (e.type) {
            case "call_invitation":
                let c = e as CallInvitation;
                _this.events.notify({
                    type: c.type,
                    sender: c.user,
                    call: createCall(c.call, _this.config.rtc, _this.log, _this.events, _this.api)
                } as Event);
                break;

            case "room_created": // FIXME Rename to room_invitation.
                _this.events.notify({
                    type: e.type,
                    room: createRoom((e as RoomCreated).room, _this.log, _this.events, _this.api)
                } as Event);
                break;

            case "message":
                _this.events.notify(createMessage(e as Message, _this.log, _this.events, _this.api));
                break;

            case "presence":
                let p = e as Presence;
                _this.events.notify({
                    type: p.type,
                    user: p.sender,
                    status: p.status,
                    timestamp: p.timestamp
                } as Event);
                break;

            default:
                _this.events.notify(e);
            }
        });
    }

    // Misc API:
    onStatusChange(callback) {
        this.events.onEvent("presence", callback);
    }

    setStatus(status) {
        this.api.setStatus(status, Date.now());
    }

    // Call API:
    onCall(callback) {
        this.events.onEvent("call_invitation", callback);
    }

    createDirectCall(peer) {
        return this._wrapCall(this.api.createDirectCall(peer));
    }

    createCall(users) {
        return this._wrapCall(this.api.createCall(users));
    }

    getCall(call) {
        return this._wrapCall(this.api.getCall(call));
    }

    getCalls() {
        return this._wrapCall(this.api.getCalls());
    }

    // Chat room API:
    onRoom(callback) {
        this.events.onEvent("room_created", callback);
    }

    createRoom(name) {
        return this._wrapRoom(this.api.createRoom(name));
    }

    createDirectRoom(peer) {
        return this._wrapRoom(this.api.createDirectRoom(peer));
    }

    getRoom(room) {
        return this._wrapRoom(this.api.getRoom(room));
    }

    getRooms() {
        return this._wrapRoom(this.api.getRooms());
    }

    getRoster() {
        return this._wrapRoom(this.api.getRoster());
    }

    // Utils:
    _wrapCall(promise) {
        return wrapPromise(promise, createCall, [this.config.rtc, this.log, this.events, this.api]);
    }

    _wrapRoom(promise) {
        return wrapPromise(promise, createRoom, [this.log, this.events, this.api]);
    }
}
